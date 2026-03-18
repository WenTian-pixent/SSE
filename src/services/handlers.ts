import { broadcast } from '../app';
import { EventName } from '../helper/enums';
import { validateMessage } from '../helper/schemaValidator';
import { EventMessage, SampleEventData } from '../types';

export function handleChannelMessage(channel: string, message: string) {
  let eventName: string;
  try {
    if (!message) {
      console.warn(`Received invalid message from channel ${channel}. Skipping.`);
      return;
    }
    const parsedMessage = JSON.parse(message) as EventMessage;
    const { event, data, userTokens } = parsedMessage;
    eventName = event;
    validateMessage(event, data);

    switch (event) {
      case EventName.SAMPLE_EVENT:
        sampleEvent(data as SampleEventData, userTokens);
        break;
      default:
        console.warn(`Received message with unknown event type '${event}' from channel ${channel}. Skipping.`);
        return;
    }
  } catch (err) {
    console.error(`Error handling message from channel: ${channel} - event: ${eventName}`, err);
  }
}

function sampleEvent(data: SampleEventData, userTokens: string[] = []) {
  broadcast(EventName.SAMPLE_EVENT, data, userTokens);
}
