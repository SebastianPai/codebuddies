import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/decorators/current-user.decorator';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageRequestDto } from './dto/create-message-request.dto';
import { MessageReactionDto } from './dto/message-reaction.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { TypingDto } from './dto/typing.dto';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  inbox(@CurrentUser() user: AuthUser) {
    return this.messagesService.inbox(user.userId);
  }

  @Get('requests')
  requests(@CurrentUser() user: AuthUser) {
    return this.messagesService.requests(user.userId);
  }

  @Post('conversations')
  createConversation(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateConversationDto,
  ) {
    return this.messagesService.createDirect(user.userId, dto.userId);
  }

  @Post('requests')
  request(@CurrentUser() user: AuthUser, @Body() dto: CreateMessageRequestDto) {
    return this.messagesService.request(
      user.userId,
      dto.username,
      dto.body,
    );
  }

  @Patch('requests/:id/accept')
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.messagesService.accept(user.userId, id);
  }

  @Patch('requests/:id/reject')
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.messagesService.reject(user.userId, id);
  }

  @Get('conversations/:id/messages')
  listMessages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.messagesService.listMessages(user.userId, id);
  }

  @Post('conversations/:id/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.send(user.userId, id, dto.body);
  }

  @Patch('conversations/:id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.messagesService.markRead(user.userId, id);
  }

  @Post('conversations/:id/typing')
  typing(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: TypingDto,
  ) {
    return this.messagesService.typing(user.userId, id, dto.isTyping);
  }

  @Post('conversations/:id/messages/:messageId/reactions')
  react(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Body() dto: MessageReactionDto,
  ) {
    return this.messagesService.react(
      user.userId,
      id,
      messageId,
      dto.emoji,
    );
  }

  @Patch('conversations/:id/delete')
  deleteConversation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.messagesService.deleteConversation(user.userId, id);
  }
}
