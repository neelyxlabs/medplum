import { QuestionnaireItem, Extension } from '@medplum/fhirtypes';

/**
 * Gets the XHTML content and style from a QuestionnaireItem if they exist.
 * Checks for rendering-xhtml, rendering-style, and rendering-styleSensitive extensions.
 * @param item - The QuestionnaireItem to check for XHTML content.
 * @returns Object containing XHTML content and optional style if found.
 */
export function getQuestionnaireItemRendering(item: QuestionnaireItem): {
  xhtml: string | undefined;
  style: string | undefined;
  styleSensitive: boolean;
} {
  const result = {
    xhtml: undefined as string | undefined,
    style: undefined as string | undefined,
    styleSensitive: false
  };

  // Check if item has style-sensitive extension
  const styleSensitive = item.extension?.find(
    (e) => e.url === 'http://hl7.org/fhir/StructureDefinition/rendering-styleSensitive'
  );
  if (styleSensitive?.valueBoolean) {
    result.styleSensitive = true;
  }

  // Check text extensions if they exist
  if ((item as Record<string, any>)._text?.extension) {
    // Find XHTML content
    const itemUnderscoreText = (item as Record<string, any>)._text;
    const xhtmlExt = itemUnderscoreText.extension.find(
      (e: Extension) => e.url === 'http://hl7.org/fhir/StructureDefinition/rendering-xhtml'
    );
    if (xhtmlExt?.valueString) {
      result.xhtml = xhtmlExt.valueString;
    }

    // Find style content
    const styleExt = itemUnderscoreText.extension.find(
      (e: Extension) => e.url === 'http://hl7.org/fhir/StructureDefinition/rendering-style'
    );
    if (styleExt?.valueString) {
      result.style = styleExt.valueString;
    }
  }

  return result;
}

/**
 * React component to safely render XHTML content from a QuestionnaireItem
 */
export function QuestionnaireItemDisplay({ item }: { item: QuestionnaireItem }): JSX.Element {
  const { xhtml, style, styleSensitive } = getQuestionnaireItemRendering(item);
  
  // Build up props based on what's available
  const props = {
    key: item.linkId,
    ...(style && styleSensitive ? { style: { cssText: style } as any } : {}),
    ...(xhtml ? { dangerouslySetInnerHTML: { __html: xhtml } } : { children: item.text })
  };

  // Use div for XHTML content, p for plain text
  const Component = xhtml ? 'div' : 'p';
  
  return <Component {...props} />;
}