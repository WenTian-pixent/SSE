import { Joi } from 'celebrate';
import { EventName } from './enums';

const SampleSchema = Joi.object({
  sampleField: Joi.string().required(),
});

const SchemaValidator: Record<string, Joi.AnySchema> = {
  [EventName.SAMPLE_EVENT]: SampleSchema,
};

export function validateMessage(event: string, data: Record<string, unknown>) {
  if (!SchemaValidator[event]) {
    throw new Error(`No schema defined for event '${event}'.`);
  }
  const joiResult = SchemaValidator[event].validate(data);
  if (joiResult.error) {
    throw new Error(joiResult.error.message);
  }
}
