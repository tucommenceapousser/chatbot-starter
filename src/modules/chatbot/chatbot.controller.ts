import { Controller, Logger } from '@nestjs/common';
import {
  DEFAULT_MESSENGER_GENDER,
  DEFAULT_MESSENGER_LOCALE,
} from 'common/config/constants';
import {
  ABOUT_ME_PAYLOAD,
  GET_STARTED_PAYLOAD,
} from 'modules/chatbot/chatbot.constants';
import { LocationService } from './services/location.service';
import { MessageService } from './services/message.service';
import { PostbackService } from './services/postback.service';
import { ResolverService } from './services/resolver.service';

@Controller()
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(
    private readonly locationService: LocationService,
    private readonly messageService: MessageService,
    private readonly postbackService: PostbackService,
    private readonly resolverService: ResolverService,
  ) {}

  private aboutMeHandler = async (context) => {
    const response = await this.resolverService.getAboutMeResponse(
      context._session.user.id,
    );

    return this.say(context, response);
  };

  private getStartedButtonHandler = async (context) => {
    const {
      id,
      firstName,
      gender = DEFAULT_MESSENGER_GENDER,
      lastName,
      locale = DEFAULT_MESSENGER_LOCALE,
      profilePic: image_url,
    } = await context.getUserProfile(context._session.user.id, [
      'id',
      'first_name',
      'gender',
      'last_name',
      'locale',
      'profile_pic',
    ]);
    const response = await this.resolverService.registerUser({
      id,
      first_name: firstName,
      gender,
      image_url,
      last_name: lastName,
      locale,
    });

    return this.say(context, response);
  };

  locationHandler = async (context) => {
    const {
      event: { location },
      _session: {
        user: { id: userId },
      },
    } = context;

    const response = await this.locationService.handleLocation(
      location,
      userId,
    );
    if (!response) return;

    return this.say(context, response);
  };

  messageHandler = async (context) => {
    const {
      event,
      _session: {
        user: { id: userId },
      },
    } = context;
    if (event.isLocation) {
      return this.locationHandler(context);
    }

    if (this.quickReplyHandlers[event.quickReply?.payload])
      return this.quickReplyHandlers[event.quickReply?.payload](context);

    const response = await this.messageService.handleMessage(event, userId);
    if (!response) return;

    return this.say(context, response);
  };

  postbackHandler = async (context) => {
    const {
      event: {
        postback: { payload: buttonPayload },
      },
      _session: {
        user: { id: userId },
      },
    } = context;

    if (this.postbackHandlers[buttonPayload])
      return this.postbackHandlers[buttonPayload](context);

    const response = await this.postbackService.handlePostback(
      buttonPayload,
      userId,
    );
    if (!response) return;

    return this.say(context, response);
  };

  say = (context, message) => {
    const {
      _session: {
        user: { id: recipientId },
      },
    } = context;
    if (typeof message === 'string') {
      return context.client.sendText(recipientId, message);
    } else if (message && message.text) {
      if (message.quickReplies && message.quickReplies.length > 0) {
        return context.client.sendText(recipientId, message.text, {
          quickReplies: message.quickReplies,
        });
      } else if (message.buttons && message.buttons.length > 0) {
        return context.client.sendTemplate(recipientId, {
          templateType: 'button',
          ...message,
        });
      }
    } else if (message && message.cards) {
      return context.client.sendGenericTemplate(recipientId, message.cards);
    } else if (Array.isArray(message)) {
      return message.reduce((promise, msg) => {
        return promise.then(() => this.say(context, msg));
      }, Promise.resolve());
    }
    this.logger.error('Invalid format for .say() message.');
  };

  postbackHandlers = {
    [ABOUT_ME_PAYLOAD]: this.aboutMeHandler,
    [GET_STARTED_PAYLOAD]: this.getStartedButtonHandler,
  };

  quickReplyHandlers = {
    [ABOUT_ME_PAYLOAD]: this.aboutMeHandler,
  };
}
