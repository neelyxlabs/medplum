import {
  badRequest,
  evalFhirPathTyped,
  Operator as FhirOperator,
  Filter,
  getSearchParameterDetails,
  getSearchParameters,
  OperationOutcomeError,
  PropertyType,
  SortRule,
  splitN,
  splitSearchOnComma,
  toTypedValue,
  TypedValue,
} from '@medplum/core';
import {
  CodeableConcept,
  Coding,
  ContactPoint,
  Identifier,
  Resource,
  ResourceType,
  SearchParameter,
} from '@medplum/fhirtypes';
import { PoolClient } from 'pg';
import { getLogger } from '../../logger';
import {
  Column,
  Condition,
  Conjunction,
  Disjunction,
  escapeLikeString,
  Expression,
  Negation,
  SelectQuery,
  SqlFunction,
} from '../sql';
import { LookupTable } from './lookuptable';
import { deriveIdentifierSearchParameter } from './util';

interface Token {
  readonly code: string;
  readonly system: string | undefined;
  readonly value: string | undefined;
}

/** Context for building a WHERE condition on the token table. */
interface FilterContext {
  searchParam: SearchParameter;
  lookupTableName: string;
  caseSensitive: boolean;
  filter: Filter;
}

/**
 * The TokenTable class is used to index and search "token" properties.
 * This can include "Identifier", "CodeableConcept", "Coding", and a number of string properties.
 * The common case for tokens is a "system" and "value" key/value pair.
 * Each token is represented as a separate row in the "Token" table.
 */
export class TokenTable extends LookupTable {
  /**
   * Returns the table name.
   * @param resourceType - The resource type.
   * @returns The table name.
   */
  getTableName(resourceType: ResourceType): string {
    return getTableName(resourceType);
  }

  /**
   * Returns the column name for the value.
   * @returns The column name.
   */
  getColumnName(): string {
    return 'value';
  }

  /**
   * Returns true if the search parameter is an "token" parameter.
   * @param searchParam - The search parameter.
   * @param resourceType - The resource type.
   * @returns True if the search parameter is an "token" parameter.
   */
  isIndexed(searchParam: SearchParameter, resourceType: string): boolean {
    return Boolean(getTokenIndexType(searchParam, resourceType));
  }

  /**
   * Indexes a resource token values.
   * Attempts to reuse existing tokens if they are correct.
   * @param client - The database client.
   * @param resource - The resource to index.
   * @param create - True if the resource should be created (vs updated).
   * @returns Promise on completion.
   */
  async indexResource(client: PoolClient, resource: Resource, create: boolean): Promise<void> {
    if (!create) {
      await this.deleteValuesForResource(client, resource);
    }

    const tokens = getTokens(resource);
    const resourceType = resource.resourceType;
    const resourceId = resource.id as string;
    const values = tokens.map((token) => ({
      resourceId,
      code: token.code,
      // logical OR coalesce to ensure that empty strings are inserted as NULL
      system: token.system?.trim?.() || undefined,
      value: token.value?.trim?.() || undefined,
    }));

    await this.insertValuesForResource(client, resourceType, values);
  }

  /**
   * Builds a "where" condition for the select query builder.
   * @param _selectQuery - The select query builder.
   * @param resourceType - The resource type.
   * @param resourceTableName - The resource table.
   * @param param - The search parameter.
   * @param filter - The search filter details.
   * @returns The select query where expression.
   */
  buildWhere(
    _selectQuery: SelectQuery,
    resourceType: ResourceType,
    resourceTableName: string,
    param: SearchParameter,
    filter: Filter
  ): Expression {
    const lookupTableName = this.getTableName(resourceType);

    const conjunction = new Conjunction([
      new Condition(new Column(resourceTableName, 'id'), '=', new Column(lookupTableName, 'resourceId')),
      new Condition(new Column(lookupTableName, 'code'), '=', filter.code),
    ]);

    const caseSensitive = isCaseSensitiveSearchParameter(param, resourceType);

    const whereExpression = buildWhereExpression({ searchParam: param, lookupTableName, caseSensitive, filter });
    if (whereExpression) {
      conjunction.expressions.push(whereExpression);
    }

    const exists = new SqlFunction('EXISTS', [new SelectQuery(lookupTableName).whereExpr(conjunction)]);

    if (shouldTokenRowExist(filter)) {
      return exists;
    } else {
      return new Negation(exists);
    }
  }

  /**
   * Adds "order by" clause to the select query builder.
   * @param selectQuery - The select query builder.
   * @param resourceType - The resource type.
   * @param sortRule - The sort rule details.
   */
  addOrderBy(selectQuery: SelectQuery, resourceType: ResourceType, sortRule: SortRule): void {
    const lookupTableName = this.getTableName(resourceType);
    const joinName = selectQuery.getNextJoinAlias();
    const joinOnExpression = new Condition(new Column(resourceType, 'id'), '=', new Column(joinName, 'resourceId'));
    selectQuery.join(
      'INNER JOIN',
      new SelectQuery(lookupTableName)
        .distinctOn('resourceId')
        .column('resourceId')
        .column('value')
        .whereExpr(new Condition(new Column(lookupTableName, 'code'), '=', sortRule.code)),
      joinName,
      joinOnExpression
    );
    selectQuery.orderBy(new Column(joinName, 'value'), sortRule.descending);
  }
}

/**
 * Returns true if the search parameter is an "token" parameter.
 * @param searchParam - The search parameter.
 * @param resourceType - The resource type.
 * @returns True if the search parameter is an "token" parameter.
 */
function getTokenIndexType(searchParam: SearchParameter, resourceType: string): TokenIndexType | undefined {
  if (searchParam.type !== 'token') {
    return undefined;
  }

  if (searchParam.code?.endsWith(':identifier')) {
    return TokenIndexTypes.CASE_SENSITIVE;
  }

  const details = getSearchParameterDetails(resourceType, searchParam);

  if (!details.elementDefinitions?.length) {
    return undefined;
  }

  // Check for any "ContactPoint", "Identifier", "CodeableConcept", "Coding"
  // Any of those value types require the "Token" table for full system|value search semantics.
  // The common case is that the "type" property only has one value,
  // but we need to support arrays of types for the choice-of-type properties such as "value[x]".

  // Check for case-insensitive types first, as they are more specific than case-sensitive types
  for (const elementDefinition of details.elementDefinitions) {
    for (const type of elementDefinition.type ?? []) {
      if (type.code === PropertyType.ContactPoint) {
        return TokenIndexTypes.CASE_INSENSITIVE;
      }
    }
  }

  // In practice, search parameters covering an element definition with type  "ContactPoint"
  // are mutually exclusive from those covering "Identifier", "CodeableConcept", or "Coding" types,
  // but could technically be possible. A second set of nested for-loops with an early return should
  // be more efficient in the common case than always exhaustively looping through every
  // detail.elementDefinitions.type to see if "ContactPoint" is still to come.
  for (const elementDefinition of details.elementDefinitions) {
    for (const type of elementDefinition.type ?? []) {
      if (
        type.code === PropertyType.Identifier ||
        type.code === PropertyType.CodeableConcept ||
        type.code === PropertyType.Coding
      ) {
        return TokenIndexTypes.CASE_SENSITIVE;
      }
    }
  }

  // This is a "token" search parameter, but it is only "code", "string", or "boolean"
  // So we can use a simple column on the resource type table.
  return undefined;
}

const TokenIndexTypes = {
  CASE_SENSITIVE: 'CASE_SENSITIVE',
  CASE_INSENSITIVE: 'CASE_INSENSITIVE',
} as const;

type TokenIndexType = (typeof TokenIndexTypes)[keyof typeof TokenIndexTypes];

/**
 * Returns true if the filter value should be compared to the "value" column.
 * Used to construct the join ON conditions
 * @param operator - Filter operator applied to the token field
 * @returns True if the filter value should be compared to the "value" column.
 */
function shouldCompareTokenValue(operator: FhirOperator): boolean {
  switch (operator) {
    case FhirOperator.MISSING:
    case FhirOperator.PRESENT:
    case FhirOperator.IN:
    case FhirOperator.NOT_IN:
    case FhirOperator.IDENTIFIER:
      return false;
    default:
      return true;
  }
}

/**
 * Returns true if the filter requires a token row to exist AFTER the join has been performed
 * @param filter - Filter applied to the token field
 * @returns True if the filter requires a token row to exist AFTER the join has been performed
 */
function shouldTokenRowExist(filter: Filter): boolean {
  if (shouldCompareTokenValue(filter.operator)) {
    // If the filter is "not equals", then we're looking for ID=null
    // If the filter is "equals", then we're looking for ID!=null
    if (filter.operator === FhirOperator.NOT || filter.operator === FhirOperator.NOT_EQUALS) {
      return false;
    }
  } else if (filter.operator === FhirOperator.MISSING) {
    // Missing = true means that there should not be a row
    switch (filter.value.toLowerCase()) {
      case 'true':
        return false;
      case 'false':
        return true;
      default:
        throw new OperationOutcomeError(badRequest("Search filter ':missing' must have a value of 'true' or 'false'"));
    }
  } else if (filter.operator === FhirOperator.PRESENT) {
    // Present = true means that there should be a row
    switch (filter.value.toLowerCase()) {
      case 'true':
        return true;
      case 'false':
        return false;
      default:
        throw new OperationOutcomeError(badRequest("Search filter ':missing' must have a value of 'true' or 'false'"));
    }
  }
  return true;
}

/**
 * Returns the token table name for the resource type.
 * @param resourceType - The FHIR resource type.
 * @returns The database table name for the resource type tokens.
 */
function getTableName(resourceType: ResourceType): string {
  return resourceType + '_Token';
}

/**
 * Returns a list of all tokens in the resource to be inserted into the database.
 * This includes all values for any SearchParameter using the TokenTable.
 * @param resource - The resource being indexed.
 * @returns An array of all tokens from the resource to be inserted into the database.
 */
function getTokens(resource: Resource): Token[] {
  const searchParams = getSearchParameters(resource.resourceType);
  const result: Token[] = [];
  if (searchParams) {
    for (const searchParam of Object.values(searchParams)) {
      if (getTokenIndexType(searchParam, resource.resourceType)) {
        buildTokensForSearchParameter(result, resource, searchParam);
      }
      if (searchParam.type === 'reference') {
        buildTokensForSearchParameter(result, resource, deriveIdentifierSearchParameter(searchParam));
      }
    }
  }
  return result;
}

/**
 * Builds a list of zero or more tokens for a search parameter and resource.
 * @param result - The result array where tokens will be added.
 * @param resource - The resource.
 * @param searchParam - The search parameter.
 */
function buildTokensForSearchParameter(result: Token[], resource: Resource, searchParam: SearchParameter): void {
  const typedValues = evalFhirPathTyped(searchParam.expression as string, [toTypedValue(resource)]);
  for (const typedValue of typedValues) {
    buildTokens(result, searchParam, resource, typedValue);
  }
}

/**
 * Builds a list of zero or more tokens for a search parameter and value.
 * @param result - The result array where tokens will be added.
 * @param searchParam - The search parameter.
 * @param resource - The resource.
 * @param typedValue - A typed value to be indexed for the search parameter.
 */
function buildTokens(result: Token[], searchParam: SearchParameter, resource: Resource, typedValue: TypedValue): void {
  const { type, value } = typedValue;

  const caseSensitive = isCaseSensitiveSearchParameter(searchParam, resource.resourceType);

  switch (type) {
    case PropertyType.Identifier:
      buildIdentifierToken(result, searchParam, caseSensitive, value as Identifier);
      break;
    case PropertyType.CodeableConcept:
      buildCodeableConceptToken(result, searchParam, caseSensitive, value as CodeableConcept);
      break;
    case PropertyType.Coding:
      buildCodingToken(result, searchParam, caseSensitive, value as Coding);
      break;
    case PropertyType.ContactPoint:
      buildContactPointToken(result, searchParam, caseSensitive, value as ContactPoint);
      break;
    default:
      buildSimpleToken(result, searchParam, caseSensitive, undefined, value?.toString() as string | undefined);
  }
}

/**
 * Builds an identifier token.
 * @param result - The result array where tokens will be added.
 * @param searchParam - The search parameter.
 * @param caseSensitive - If the token value should be case sensitive.
 * @param identifier - The Identifier object to be indexed.
 */
function buildIdentifierToken(
  result: Token[],
  searchParam: SearchParameter,
  caseSensitive: boolean,
  identifier: Identifier | undefined
): void {
  buildSimpleToken(result, searchParam, caseSensitive, identifier?.system, identifier?.value);
}

/**
 * Builds zero or more CodeableConcept tokens.
 * @param result - The result array where tokens will be added.
 * @param searchParam - The search parameter.
 * @param caseSensitive - If the token value should be case sensitive.
 * @param codeableConcept - The CodeableConcept object to be indexed.
 */
function buildCodeableConceptToken(
  result: Token[],
  searchParam: SearchParameter,
  caseSensitive: boolean,
  codeableConcept: CodeableConcept | undefined
): void {
  if (codeableConcept?.text) {
    buildSimpleToken(result, searchParam, caseSensitive, 'text', codeableConcept.text);
  }
  if (codeableConcept?.coding) {
    for (const coding of codeableConcept.coding) {
      buildCodingToken(result, searchParam, caseSensitive, coding);
    }
  }
}

/**
 * Builds a Coding token.
 * @param result - The result array where tokens will be added.
 * @param searchParam - The search parameter.
 * @param caseSensitive - If the token value should be case sensitive.
 * @param coding - The Coding object to be indexed.
 */
function buildCodingToken(
  result: Token[],
  searchParam: SearchParameter,
  caseSensitive: boolean,
  coding: Coding | undefined
): void {
  if (coding) {
    if (coding.display) {
      buildSimpleToken(result, searchParam, caseSensitive, 'text', coding.display);
    }
    buildSimpleToken(result, searchParam, caseSensitive, coding.system, coding.code);
  }
}

/**
 * Builds a ContactPoint token.
 * @param result - The result array where tokens will be added.
 * @param searchParam - The search parameter.
 * @param caseSensitive - If the token value should be case sensitive.
 * @param contactPoint - The ContactPoint object to be indexed.
 */
function buildContactPointToken(
  result: Token[],
  searchParam: SearchParameter,
  caseSensitive: boolean,
  contactPoint: ContactPoint | undefined
): void {
  buildSimpleToken(
    result,
    searchParam,
    caseSensitive,
    contactPoint?.system,
    contactPoint?.value ? contactPoint.value.toLocaleLowerCase() : contactPoint?.value
  );
}

/**
 * Builds a simple token.
 * @param result - The result array where tokens will be added.
 * @param searchParam - The search parameter.
 * @param caseSensitive - If the token value should be case sensitive.
 * @param system - The token system.
 * @param value - The token value.
 */
function buildSimpleToken(
  result: Token[],
  searchParam: SearchParameter,
  caseSensitive: boolean,
  system: string | undefined,
  value: string | undefined
): void {
  // Only add the token if there is a system or a value, and if it is not already in the list.
  if (
    (system || value) &&
    !result.some((token) => token.code === searchParam.code && token.system === system && token.value === value)
  ) {
    result.push({
      code: searchParam.code as string,
      system,
      value: value && !caseSensitive ? value.toLocaleLowerCase() : value,
    });
  }
}

/**
 *
 * Returns a Disjunction of filters on the token table based on `filter.operator`, or `undefined` if no filters are required.
 * The Disjunction will contain one filter for each specified query value.
 *
 * @param context - The context of the filter being performed.
 * @returns A Disjunction of filters on the token table based on `filter.operator`, or `undefined` if no filters are
 * required.
 */
function buildWhereExpression(context: FilterContext): Expression | undefined {
  const subExpressions = [];
  for (const option of splitSearchOnComma(context.filter.value)) {
    const expression = buildWhereCondition(context, option);
    if (expression) {
      subExpressions.push(expression);
    }
  }
  if (subExpressions.length > 0) {
    return new Disjunction(subExpressions);
  }
  // filter.operator does not require any WHERE Conditions on the token table (e.g. FhirOperator.MISSING)
  return undefined;
}

/**
 *
 * Returns a WHERE Condition for a specific search query value, if applicable based on the `operator`
 *
 * @param context - The context of the filter being performed.
 * @param query - The query value of the operator
 * @returns A WHERE Condition on the token table, if applicable, else undefined
 */
function buildWhereCondition(context: FilterContext, query: string): Expression | undefined {
  const operator = context.filter.operator;
  const parts = splitN(query, '|', 2);
  // Handle the case where the query value is a system|value pair (e.g. token or identifier search)
  if (parts.length === 2) {
    const system = parts[0] || null; // Logical OR coalesce to account for system being the empty string, i.e. [parameter]=|[code]
    const value = parts[1];
    const systemCondition = new Condition(new Column(context.lookupTableName, 'system'), '=', system);
    return value ? new Conjunction([systemCondition, buildValueCondition(context, value)]) : systemCondition;
  } else {
    // If using the :in operator, build the condition for joining to the ValueSet table specified by `query`
    if (operator === FhirOperator.IN) {
      return buildInValueSetCondition(context.lookupTableName, query);
    } else if (operator === FhirOperator.NOT_IN) {
      return new Negation(buildInValueSetCondition(context.lookupTableName, query));
    }
    // If we we are searching for a particular token value, build a Condition that filters the lookup table on that
    //value
    if (shouldCompareTokenValue(operator)) {
      return buildValueCondition(context, query);
    }
    // Otherwise we are just looking for the presence / absence of a token (e.g. when using the FhirOperator.MISSING)
    // so we don't need to construct a filter Condition on the token table.
    return undefined;
  }
}

function buildValueCondition(context: FilterContext, value: string): Expression {
  const { lookupTableName: tableName, caseSensitive } = context;
  const operator = context.filter.operator;
  const column = new Column(tableName, 'value');
  value = value.trim();

  if (operator === FhirOperator.TEXT) {
    logExpensiveQuery(context, value);
    return new Conjunction([
      new Condition(new Column(tableName, 'system'), '=', 'text'),
      new Condition(column, 'TSVECTOR_SIMPLE', value + ':*'),
    ]);
  } else if (operator === FhirOperator.CONTAINS) {
    logExpensiveQuery(context, value);
    return new Condition(column, 'LIKE', escapeLikeString(value) + '%');
  } else if (caseSensitive) {
    return new Condition(column, '=', value);
  } else {
    // In Medplum v4, or when there is a guarantee all resources have been reindexed, the IN (...) can be
    // switched to an '=' of just the lower-cased value for a simplified query and potentially better performance.
    return new Condition(column, 'IN', [value, value.toLocaleLowerCase()]);
  }
}

function logExpensiveQuery(context: FilterContext, value: string): void {
  getLogger().warn('Potentially expensive token lookup query', {
    operator: context.filter.operator,
    searchParameter: { id: context.searchParam.id, code: context.searchParam.code },
    filterValue: context.filter.value,
    value,
  });
}

/**
 * Builds "where" condition for token ":in" operator.
 * @param tableName - The token table name / join alias.
 * @param value - The value of the ":in" operator.
 * @returns The "where" condition.
 */
function buildInValueSetCondition(tableName: string, value: string): Condition {
  // This is complicated
  //
  // Here is an example FHIR expression:
  //
  //    Condition?code:in=http://hl7.org/fhir/ValueSet/condition-code
  //
  // The ValueSet URL is a reference to a ValueSet resource.
  // The ValueSet resource contains a list of systems and/or codes.
  //
  // Consider these "ValueSet" table columns:
  //
  //          Column        |           Type           | Collation | Nullable | Default
  //   ---------------------+--------------------------+-----------+----------+---------
  //    id                  | uuid                     |           | not null |
  //    url                 | text                     |           |          |
  //    reference           | text[]                   |           |          |
  //
  // Consider these "Condition_Token" table columns:
  //
  //      Column   |  Type   | Collation | Nullable | Default
  //   ------------+---------+-----------+----------+---------
  //    resourceId | uuid    |           | not null |
  //    code       | text    |           | not null |
  //    system     | text    |           |          |
  //    value      | text    |           |          |
  //
  // In plain english:
  //
  //   We want the Condition resources
  //   with a fixed "code" column value (referring to the "code" column in the "Condition_Token" table)
  //   where the "system" column value is in the "reference" column of the "ValueSet" table
  //
  // Now imagine the query for just "Condition_Token" and "ValueSet":
  //
  //  SELECT "Condition_Token"."resourceId"
  //  FROM "Condition_Token"
  //  WHERE "Condition_Token"."code"='code'
  //  AND "Condition_Token"."system"=ANY(
  //    (
  //       SELECT "ValueSet"."reference"
  //       FROM "ValueSet"
  //       WHERE "ValueSet"."url"='http://hl7.org/fhir/ValueSet/condition-code'
  //       LIMIT 1
  //    )::TEXT[]
  //  )
  //
  // Now we need to add the query for "Condition" and "Condition_Token" and "ValueSet":
  //
  //   SELECT "Condition"."id"
  //   FROM "Condition"
  //   LEFT JOIN "Condition_Token" ON (
  //     "Condition_Token"."resourceId"="Condition"."id"
  //     AND
  //     "Condition_Token"."code"='code'
  //     AND
  //     "Condition_Token"."system"=ANY(
  //       (
  //         SELECT "ValueSet"."reference"
  //         FROM "ValueSet"
  //         WHERE "ValueSet"."url"='http://hl7.org/fhir/ValueSet/condition-code'
  //         LIMIT 1
  //       )::TEXT[]
  //     )
  //   )
  //
  return new Condition(
    new Column(tableName, 'system'),
    'IN_SUBQUERY',
    new SelectQuery('ValueSet').column('reference').where('url', '=', value).limit(1),
    'TEXT[]'
  );
}

/**
 * If the search parameter should be considered case-sensitive when searching for tokens.
 * @param param - The search parameter.
 * @param resourceType - The resource type being searched.
 * @returns True if the search parameter should be considered case-sensitive when searching for tokens.
 */
function isCaseSensitiveSearchParameter(param: SearchParameter, resourceType: ResourceType): boolean {
  return getTokenIndexType(param, resourceType) === TokenIndexTypes.CASE_SENSITIVE;
}
