import { ThemeProps } from '@rjsf/core';
import { FormContextType, RJSFSchema, StrictRJSFSchema } from '@rjsf/utils';
// @ts-expect-error missing types for Stack
import { Stack } from '@carbon/react';
import { generateTemplates } from '../Templates';
import { generateWidgets } from '../Widgets';
import { ElementType, forwardRef } from 'react';

/** Implement `_internalFormWrapper`, in order to better layout
 */
export const InternalFormWrapper = forwardRef(function InternalFormWrapper(
  { children, as, ...props }: { children: React.ReactNode; as?: ElementType },
  ref
) {
  const FormTag: ElementType = as || 'form';
  return (
    <FormTag ref={ref} {...props}>
      <Stack gap={8}>{children}</Stack>
    </FormTag>
  );
});

/** Generates a theme for the Carbon Design System
 */
export function generateTheme<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any
>(): ThemeProps<T, S, F> {
  return {
    templates: generateTemplates<T, S, F>(),
    widgets: generateWidgets<T, S, F>(),
    _internalFormWrapper: InternalFormWrapper,
  };
}

export default generateTheme();