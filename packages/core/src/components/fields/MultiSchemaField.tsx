import { Component } from 'react';
import get from 'lodash/get';
import omit from 'lodash/omit';
import {
  deepEquals,
  ERRORS_KEY,
  FieldProps,
  FormContextType,
  getDiscriminatorFieldFromSchema,
  getTemplate,
  getUiOptions,
  mergeSchemas,
  RJSFSchema,
  StrictRJSFSchema,
  TranslatableString,
  MultiSchemaFieldTemplateProps,
} from '@rjsf/utils';

/** Type used for the state of the `AnyOfField` component */
type AnyOfFieldState<S extends StrictRJSFSchema = RJSFSchema> = {
  /** The currently selected option */
  selectedOption: number;
  /** The option schemas after retrieving all $refs */
  retrievedOptions: S[];
};

/** The `AnyOfField` component is used to render a field in the schema that is an `anyOf`, `allOf` or `oneOf`. It tracks
 * the currently selected option and cleans up any irrelevant data in `formData`.
 *
 * @param props - The `FieldProps` for this template
 */
class AnyOfField<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any> extends Component<
  FieldProps<T, S, F>,
  AnyOfFieldState<S>
> {
  /** Constructs an `AnyOfField` with the given `props` to initialize the initially selected option in state
   *
   * @param props - The `FieldProps` for this template
   */
  constructor(props: FieldProps<T, S, F>) {
    super(props);

    const {
      formData,
      options,
      registry: { schemaUtils },
    } = this.props;
    // cache the retrieved options in state in case they have $refs to save doing it later
    const retrievedOptions = options.map((opt: S) => schemaUtils.retrieveSchema(opt, formData));

    this.state = {
      retrievedOptions,
      selectedOption: this.getMatchingOption(0, formData, retrievedOptions),
    };
  }

  /** React lifecycle method that is called when the props and/or state for this component is updated. It recomputes the
   * currently selected option based on the overall `formData`
   *
   * @param prevProps - The previous `FieldProps` for this template
   * @param prevState - The previous `AnyOfFieldState` for this template
   */
  componentDidUpdate(prevProps: Readonly<FieldProps<T, S, F>>, prevState: Readonly<AnyOfFieldState>) {
    const { formData, options, idSchema } = this.props;
    const { selectedOption } = this.state;
    let newState = this.state;
    if (!deepEquals(prevProps.options, options)) {
      const {
        registry: { schemaUtils },
      } = this.props;
      // re-cache the retrieved options in state in case they have $refs to save doing it later
      const retrievedOptions = options.map((opt: S) => schemaUtils.retrieveSchema(opt, formData));
      newState = { selectedOption, retrievedOptions };
    }
    if (!deepEquals(formData, prevProps.formData) && idSchema.$id === prevProps.idSchema.$id) {
      const { retrievedOptions } = newState;
      const matchingOption = this.getMatchingOption(selectedOption, formData, retrievedOptions);

      if (prevState && matchingOption !== selectedOption) {
        newState = { selectedOption: matchingOption, retrievedOptions };
      }
    }
    if (newState !== this.state) {
      this.setState(newState);
    }
  }

  /** Determines the best matching option for the given `formData` and `options`.
   *
   * @param formData - The new formData
   * @param options - The list of options to choose from
   * @return - The index of the `option` that best matches the `formData`
   */
  getMatchingOption(selectedOption: number, formData: T | undefined, options: S[]) {
    const {
      schema,
      registry: { schemaUtils },
    } = this.props;

    const discriminator = getDiscriminatorFieldFromSchema<S>(schema);
    const option = schemaUtils.getClosestMatchingOption(formData, options, selectedOption, discriminator);
    return option;
  }

  /** Callback handler to remember what the currently selected option is. In addition to that the `formData` is updated
   * to remove properties that are not part of the newly selected option schema, and then the updated data is passed to
   * the `onChange` handler.
   *
   * @param option - The new option value being selected
   */
  onOptionChange = (option?: string) => {
    const { selectedOption, retrievedOptions } = this.state;
    const { formData, onChange, registry } = this.props;
    const { schemaUtils } = registry;
    const intOption = option !== undefined ? parseInt(option, 10) : -1;
    if (intOption === selectedOption) {
      return;
    }
    const newOption = intOption >= 0 ? retrievedOptions[intOption] : undefined;
    const oldOption = selectedOption >= 0 ? retrievedOptions[selectedOption] : undefined;

    let newFormData = schemaUtils.sanitizeDataForNewSchema(newOption, oldOption, formData);
    if (newFormData && newOption) {
      // Call getDefaultFormState to make sure defaults are populated on change. Pass "excludeObjectChildren"
      // so that only the root objects themselves are created without adding undefined children properties
      newFormData = schemaUtils.getDefaultFormState(newOption, newFormData, 'excludeObjectChildren') as T;
    }
    onChange(newFormData, undefined, this.getFieldId());

    this.setState({ selectedOption: intOption });
  };

  getFieldId() {
    const { idSchema, schema } = this.props;
    return `${idSchema.$id}${schema.oneOf ? '__oneof_select' : '__anyof_select'}`;
  }

  /** Renders the `AnyOfField` selector along with a `SchemaField` for the value of the `formData`
   */
  render() {
    const { name, errorSchema = {}, registry, schema, title, uiSchema } = this.props;
    const { fields, translateString, globalUiOptions } = registry;
    const { SchemaField: _SchemaField } = fields;
    const { selectedOption, retrievedOptions } = this.state;
    const uiOptions = getUiOptions<T, S, F>(uiSchema, globalUiOptions);
    const rawErrors = get(errorSchema, ERRORS_KEY, []);
    const fieldErrorSchema = omit(errorSchema, [ERRORS_KEY]);

    const option = selectedOption >= 0 ? retrievedOptions[selectedOption] || null : null;
    let optionSchema: S;

    if (option) {
      // merge top level required field
      const { required } = schema;
      // Merge in all the non-oneOf/anyOf properties and also skip the special ADDITIONAL_PROPERTY_FLAG property
      optionSchema = required ? (mergeSchemas({ required }, option) as S) : option;
    }

    const translateEnum: TranslatableString = title
      ? TranslatableString.TitleOptionPrefix
      : TranslatableString.OptionPrefix;
    const translateParams = title ? [title] : [];
    const enumOptions = retrievedOptions.map((opt: { title?: string }, index: number) => ({
      label: opt.title || translateString(translateEnum, translateParams.concat(String(index + 1))),
      value: index,
    }));

    const multiSchemaFieldTemplateProps: MultiSchemaFieldTemplateProps = {
      ...omit(this.props, ['onChange']),
      errorSchema: fieldErrorSchema,
      rawErrors,
      select: {
        id: this.getFieldId(),
        name: `${name}${schema.oneOf ? '__oneof_select' : '__anyof_select'}`,
        value: selectedOption >= 0 ? selectedOption : undefined,
        enumOptions,
        onChange: this.onOptionChange,
      },
      content: option !== null && <_SchemaField {...this.props} schema={optionSchema!} />,
    };

    const Template = getTemplate('AnyOfFieldTemplate', registry, uiOptions);

    return <Template {...multiSchemaFieldTemplateProps} />;
  }
}

export default AnyOfField;

// TODO 应该传哪些 props 给 template？
// TODO 同时支持 oneOf 和 anyOf
