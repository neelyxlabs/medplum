/*
 * This is a generated file
 * Do not edit manually.
 */

import { Annotation } from './Annotation';
import { CarePlan } from './CarePlan';
import { CareTeam } from './CareTeam';
import { CodeableConcept } from './CodeableConcept';
import { Device } from './Device';
import { DeviceMetric } from './DeviceMetric';
import { DeviceRequest } from './DeviceRequest';
import { DocumentReference } from './DocumentReference';
import { Encounter } from './Encounter';
import { Extension } from './Extension';
import { Group } from './Group';
import { Identifier } from './Identifier';
import { ImagingStudy } from './ImagingStudy';
import { Immunization } from './Immunization';
import { ImmunizationRecommendation } from './ImmunizationRecommendation';
import { Location } from './Location';
import { Media } from './Media';
import { MedicationAdministration } from './MedicationAdministration';
import { MedicationDispense } from './MedicationDispense';
import { MedicationRequest } from './MedicationRequest';
import { MedicationStatement } from './MedicationStatement';
import { Meta } from './Meta';
import { MolecularSequence } from './MolecularSequence';
import { Narrative } from './Narrative';
import { NutritionOrder } from './NutritionOrder';
import { Organization } from './Organization';
import { Patient } from './Patient';
import { Period } from './Period';
import { Practitioner } from './Practitioner';
import { PractitionerRole } from './PractitionerRole';
import { Procedure } from './Procedure';
import { Quantity } from './Quantity';
import { QuestionnaireResponse } from './QuestionnaireResponse';
import { Range } from './Range';
import { Ratio } from './Ratio';
import { Reference } from './Reference';
import { RelatedPerson } from './RelatedPerson';
import { Resource } from './Resource';
import { SampledData } from './SampledData';
import { ServiceRequest } from './ServiceRequest';
import { Specimen } from './Specimen';
import { Timing } from './Timing';

/**
 * Measurements and simple assertions made about a patient, device or
 * other subject.
 */
export interface Observation {

  /**
   * This is a Observation resource
   */
  readonly resourceType: 'Observation';

  /**
   * The logical id of the resource, as used in the URL for the resource.
   * Once assigned, this value never changes.
   */
  id?: string;

  /**
   * The metadata about the resource. This is content that is maintained by
   * the infrastructure. Changes to the content might not always be
   * associated with version changes to the resource.
   */
  meta?: Meta;

  /**
   * A reference to a set of rules that were followed when the resource was
   * constructed, and which must be understood when processing the content.
   * Often, this is a reference to an implementation guide that defines the
   * special rules along with other profiles etc.
   */
  implicitRules?: string;

  /**
   * The base language in which the resource is written.
   */
  language?: string;

  /**
   * A human-readable narrative that contains a summary of the resource and
   * can be used to represent the content of the resource to a human. The
   * narrative need not encode all the structured data, but is required to
   * contain sufficient detail to make it &quot;clinically safe&quot; for a human to
   * just read the narrative. Resource definitions may define what content
   * should be represented in the narrative to ensure clinical safety.
   */
  text?: Narrative;

  /**
   * These resources do not have an independent existence apart from the
   * resource that contains them - they cannot be identified independently,
   * and nor can they have their own independent transaction scope.
   */
  contained?: Resource[];

  /**
   * May be used to represent additional information that is not part of
   * the basic definition of the resource. To make the use of extensions
   * safe and manageable, there is a strict set of governance  applied to
   * the definition and use of extensions. Though any implementer can
   * define an extension, there is a set of requirements that SHALL be met
   * as part of the definition of the extension.
   */
  extension?: Extension[];

  /**
   * May be used to represent additional information that is not part of
   * the basic definition of the resource and that modifies the
   * understanding of the element that contains it and/or the understanding
   * of the containing element's descendants. Usually modifier elements
   * provide negation or qualification. To make the use of extensions safe
   * and manageable, there is a strict set of governance applied to the
   * definition and use of extensions. Though any implementer is allowed to
   * define an extension, there is a set of requirements that SHALL be met
   * as part of the definition of the extension. Applications processing a
   * resource are required to check for modifier extensions.
   *
   * Modifier extensions SHALL NOT change the meaning of any elements on
   * Resource or DomainResource (including cannot change the meaning of
   * modifierExtension itself).
   */
  modifierExtension?: Extension[];

  /**
   * A unique identifier assigned to this observation.
   */
  identifier?: Identifier[];

  /**
   * A plan, proposal or order that is fulfilled in whole or in part by
   * this event.  For example, a MedicationRequest may require a patient to
   * have laboratory test performed before  it is dispensed.
   */
  basedOn?: Reference<CarePlan | DeviceRequest | ImmunizationRecommendation | MedicationRequest | NutritionOrder | ServiceRequest>[];

  /**
   * A larger event of which this particular Observation is a component or
   * step.  For example,  an observation as part of a procedure.
   */
  partOf?: Reference<MedicationAdministration | MedicationDispense | MedicationStatement | Procedure | Immunization | ImagingStudy>[];

  /**
   * The status of the result value.
   */
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';

  /**
   * A code that classifies the general type of observation being made.
   */
  category?: CodeableConcept[];

  /**
   * Describes what was observed. Sometimes this is called the observation
   * &quot;name&quot;.
   */
  code: CodeableConcept;

  /**
   * The patient, or group of patients, location, or device this
   * observation is about and into whose record the observation is placed.
   * If the actual focus of the observation is different from the subject
   * (or a sample of, part, or region of the subject), the `focus` element
   * or the `code` itself specifies the actual focus of the observation.
   */
  subject?: Reference<Patient | Group | Device | Location>;

  /**
   * The actual focus of an observation when it is not the patient of
   * record representing something or someone associated with the patient
   * such as a spouse, parent, fetus, or donor. For example, fetus
   * observations in a mother's record.  The focus of an observation could
   * also be an existing condition,  an intervention, the subject's diet,
   * another observation of the subject,  or a body structure such as tumor
   * or implanted device.   An example use case would be using the
   * Observation resource to capture whether the mother is trained to
   * change her child's tracheostomy tube. In this example, the child is
   * the patient of record and the mother is the focus.
   */
  focus?: Reference<Resource>[];

  /**
   * The healthcare event  (e.g. a patient and healthcare provider
   * interaction) during which this observation is made.
   */
  encounter?: Reference<Encounter>;

  /**
   * The time or time-period the observed value is asserted as being true.
   * For biological subjects - e.g. human patients - this is usually called
   * the &quot;physiologically relevant time&quot;. This is usually either the time
   * of the procedure or of specimen collection, but very often the source
   * of the date/time is not known, only the date/time itself.
   */
  effectiveDateTime?: string;

  /**
   * The time or time-period the observed value is asserted as being true.
   * For biological subjects - e.g. human patients - this is usually called
   * the &quot;physiologically relevant time&quot;. This is usually either the time
   * of the procedure or of specimen collection, but very often the source
   * of the date/time is not known, only the date/time itself.
   */
  effectivePeriod?: Period;

  /**
   * The time or time-period the observed value is asserted as being true.
   * For biological subjects - e.g. human patients - this is usually called
   * the &quot;physiologically relevant time&quot;. This is usually either the time
   * of the procedure or of specimen collection, but very often the source
   * of the date/time is not known, only the date/time itself.
   */
  effectiveTiming?: Timing;

  /**
   * The time or time-period the observed value is asserted as being true.
   * For biological subjects - e.g. human patients - this is usually called
   * the &quot;physiologically relevant time&quot;. This is usually either the time
   * of the procedure or of specimen collection, but very often the source
   * of the date/time is not known, only the date/time itself.
   */
  effectiveInstant?: string;

  /**
   * The date and time this version of the observation was made available
   * to providers, typically after the results have been reviewed and
   * verified.
   */
  issued?: string;

  /**
   * Who was responsible for asserting the observed value as &quot;true&quot;.
   */
  performer?: Reference<Practitioner | PractitionerRole | Organization | CareTeam | Patient | RelatedPerson>[];

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueQuantity?: Quantity;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueCodeableConcept?: CodeableConcept;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueString?: string;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueBoolean?: boolean;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueInteger?: number;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueRange?: Range;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueRatio?: Ratio;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueSampledData?: SampledData;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueTime?: string;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueDateTime?: string;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valuePeriod?: Period;

  /**
   * Provides a reason why the expected value in the element
   * Observation.value[x] is missing.
   */
  dataAbsentReason?: CodeableConcept;

  /**
   * A categorical assessment of an observation value.  For example, high,
   * low, normal.
   */
  interpretation?: CodeableConcept[];

  /**
   * Comments about the observation or the results.
   */
  note?: Annotation[];

  /**
   * Indicates the site on the subject's body where the observation was
   * made (i.e. the target site).
   */
  bodySite?: CodeableConcept;

  /**
   * Indicates the mechanism used to perform the observation.
   */
  method?: CodeableConcept;

  /**
   * The specimen that was used when this observation was made.
   */
  specimen?: Reference<Specimen>;

  /**
   * The device used to generate the observation data.
   */
  device?: Reference<Device | DeviceMetric>;

  /**
   * Guidance on how to interpret the value by comparison to a normal or
   * recommended range.  Multiple reference ranges are interpreted as an
   * &quot;OR&quot;.   In other words, to represent two distinct target populations,
   * two `referenceRange` elements would be used.
   */
  referenceRange?: ObservationReferenceRange[];

  /**
   * This observation is a group observation (e.g. a battery, a panel of
   * tests, a set of vital sign measurements) that includes the target as a
   * member of the group.
   */
  hasMember?: Reference<Observation | QuestionnaireResponse | MolecularSequence>[];

  /**
   * The target resource that represents a measurement from which this
   * observation value is derived. For example, a calculated anion gap or a
   * fetal measurement based on an ultrasound image.
   */
  derivedFrom?: Reference<DocumentReference | ImagingStudy | Media | QuestionnaireResponse | Observation | MolecularSequence>[];

  /**
   * Some observations have multiple component observations.  These
   * component observations are expressed as separate code value pairs that
   * share the same attributes.  Examples include systolic and diastolic
   * component observations for blood pressure measurement and multiple
   * component observations for genetics observations.
   */
  component?: ObservationComponent[];
}

/**
 * The time or time-period the observed value is asserted as being true.
 * For biological subjects - e.g. human patients - this is usually called
 * the &quot;physiologically relevant time&quot;. This is usually either the time
 * of the procedure or of specimen collection, but very often the source
 * of the date/time is not known, only the date/time itself.
 */
export type ObservationEffective = Period | string | Timing;

/**
 * The information determined as a result of making the observation, if
 * the information has a simple value.
 */
export type ObservationValue = boolean | CodeableConcept | number | Period | Quantity | Range | Ratio | SampledData | string;

/**
 * Some observations have multiple component observations.  These
 * component observations are expressed as separate code value pairs that
 * share the same attributes.  Examples include systolic and diastolic
 * component observations for blood pressure measurement and multiple
 * component observations for genetics observations.
 */
export interface ObservationComponent {

  /**
   * Unique id for the element within a resource (for internal references).
   * This may be any string value that does not contain spaces.
   */
  id?: string;

  /**
   * May be used to represent additional information that is not part of
   * the basic definition of the element. To make the use of extensions
   * safe and manageable, there is a strict set of governance  applied to
   * the definition and use of extensions. Though any implementer can
   * define an extension, there is a set of requirements that SHALL be met
   * as part of the definition of the extension.
   */
  extension?: Extension[];

  /**
   * May be used to represent additional information that is not part of
   * the basic definition of the element and that modifies the
   * understanding of the element in which it is contained and/or the
   * understanding of the containing element's descendants. Usually
   * modifier elements provide negation or qualification. To make the use
   * of extensions safe and manageable, there is a strict set of governance
   * applied to the definition and use of extensions. Though any
   * implementer can define an extension, there is a set of requirements
   * that SHALL be met as part of the definition of the extension.
   * Applications processing a resource are required to check for modifier
   * extensions.
   *
   * Modifier extensions SHALL NOT change the meaning of any elements on
   * Resource or DomainResource (including cannot change the meaning of
   * modifierExtension itself).
   */
  modifierExtension?: Extension[];

  /**
   * Describes what was observed. Sometimes this is called the observation
   * &quot;code&quot;.
   */
  code: CodeableConcept;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueQuantity?: Quantity;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueCodeableConcept?: CodeableConcept;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueString?: string;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueBoolean?: boolean;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueInteger?: number;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueRange?: Range;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueRatio?: Ratio;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueSampledData?: SampledData;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueTime?: string;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valueDateTime?: string;

  /**
   * The information determined as a result of making the observation, if
   * the information has a simple value.
   */
  valuePeriod?: Period;

  /**
   * Provides a reason why the expected value in the element
   * Observation.component.value[x] is missing.
   */
  dataAbsentReason?: CodeableConcept;

  /**
   * A categorical assessment of an observation value.  For example, high,
   * low, normal.
   */
  interpretation?: CodeableConcept[];

  /**
   * Guidance on how to interpret the value by comparison to a normal or
   * recommended range.
   */
  referenceRange?: ObservationReferenceRange[];
}

/**
 * The information determined as a result of making the observation, if
 * the information has a simple value.
 */
export type ObservationComponentValue = boolean | CodeableConcept | number | Period | Quantity | Range | Ratio | SampledData | string;

/**
 * Guidance on how to interpret the value by comparison to a normal or
 * recommended range.  Multiple reference ranges are interpreted as an
 * &quot;OR&quot;.   In other words, to represent two distinct target populations,
 * two `referenceRange` elements would be used.
 */
export interface ObservationReferenceRange {

  /**
   * Unique id for the element within a resource (for internal references).
   * This may be any string value that does not contain spaces.
   */
  id?: string;

  /**
   * May be used to represent additional information that is not part of
   * the basic definition of the element. To make the use of extensions
   * safe and manageable, there is a strict set of governance  applied to
   * the definition and use of extensions. Though any implementer can
   * define an extension, there is a set of requirements that SHALL be met
   * as part of the definition of the extension.
   */
  extension?: Extension[];

  /**
   * May be used to represent additional information that is not part of
   * the basic definition of the element and that modifies the
   * understanding of the element in which it is contained and/or the
   * understanding of the containing element's descendants. Usually
   * modifier elements provide negation or qualification. To make the use
   * of extensions safe and manageable, there is a strict set of governance
   * applied to the definition and use of extensions. Though any
   * implementer can define an extension, there is a set of requirements
   * that SHALL be met as part of the definition of the extension.
   * Applications processing a resource are required to check for modifier
   * extensions.
   *
   * Modifier extensions SHALL NOT change the meaning of any elements on
   * Resource or DomainResource (including cannot change the meaning of
   * modifierExtension itself).
   */
  modifierExtension?: Extension[];

  /**
   * The value of the low bound of the reference range.  The low bound of
   * the reference range endpoint is inclusive of the value (e.g.
   * reference range is &gt;=5 - &lt;=9). If the low bound is omitted,  it is
   * assumed to be meaningless (e.g. reference range is &lt;=2.3).
   */
  low?: Quantity;

  /**
   * The value of the high bound of the reference range.  The high bound of
   * the reference range endpoint is inclusive of the value (e.g.
   * reference range is &gt;=5 - &lt;=9). If the high bound is omitted,  it is
   * assumed to be meaningless (e.g. reference range is &gt;= 2.3).
   */
  high?: Quantity;

  /**
   * Codes to indicate the what part of the targeted reference population
   * it applies to. For example, the normal or therapeutic range.
   */
  type?: CodeableConcept;

  /**
   * Codes to indicate the target population this reference range applies
   * to.  For example, a reference range may be based on the normal
   * population or a particular sex or race.  Multiple `appliesTo`  are
   * interpreted as an &quot;AND&quot; of the target populations.  For example, to
   * represent a target population of African American females, both a code
   * of female and a code for African American would be used.
   */
  appliesTo?: CodeableConcept[];

  /**
   * The age at which this reference range is applicable. This is a
   * neonatal age (e.g. number of weeks at term) if the meaning says so.
   */
  age?: Range;

  /**
   * Text based reference range in an observation which may be used when a
   * quantitative range is not appropriate for an observation.  An example
   * would be a reference value of &quot;Negative&quot; or a list or table of
   * &quot;normals&quot;.
   */
  text?: string;
}
