import {
  FormContextType,
  RJSFSchema,
  StrictRJSFSchema,
  getUiOptions,
  getWidget,
  MultiSchemaFieldTemplateProps,
} from '@rjsf/utils';
import { isEmpty } from 'lodash';

export default function MultiSchemaFieldTemplate<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any
>(props: MultiSchemaFieldTemplateProps) {
  const { schema, uiSchema, select, name, rawErrors, errorSchema, content, registry, onBlur, onFocus, disabled } =
    props;
  const { widgets, formContext, globalUiOptions, schemaUtils } = registry;
  const {
    widget = 'select',
    placeholder,
    autofocus,
    autocomplete,
    title = schema.title,
    ...uiOptions
  } = getUiOptions<T, S, F>(uiSchema, globalUiOptions);
  const Widget = getWidget<T, S, F>({ type: 'number' }, widget, widgets);
  const displayLabel = schemaUtils.getDisplayLabel(schema, uiSchema, globalUiOptions);
  return (
    <div className='panel panel-default panel-body'>
      <div className='form-group'>
        <Widget
          id={select.id}
          name={select.name}
          schema={{ type: 'number', default: 0 } as S}
          onChange={select.onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={disabled || isEmpty(select.enumOptions)}
          multiple={false}
          rawErrors={rawErrors}
          errorSchema={errorSchema}
          value={select.value}
          options={{ enumOptions: select.enumOptions, ...uiOptions }}
          registry={registry}
          formContext={formContext}
          placeholder={placeholder}
          autocomplete={autocomplete}
          autofocus={autofocus}
          label={title ?? name}
          hideLabel={!displayLabel}
        />
      </div>
      {content}
    </div>
  );
}
