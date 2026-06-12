import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-chats',
  templateUrl: './chats.page.html',
  styleUrls: ['./chats.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class ChatsPage implements OnInit {
  loading = false;
  sending = false;
  errorMsg = '';
  successMsg = '';
  currentUser: any = null;
  chats: any[] = [];
  selectedChat: any = null;
  messageBody = '';
  private pendingChatId: number | null = null;

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    private route: ActivatedRoute,
  ) {}

  async ngOnInit() {
    this.currentUser = await this.resolveCurrentUser();
    this.route.queryParamMap.subscribe(params => {
      const chatId = Number(params.get('chat'));
      this.pendingChatId = Number.isFinite(chatId) && chatId > 0 ? chatId : null;
      if (this.pendingChatId) {
        this.openChat({ id: this.pendingChatId });
      }
    });
    this.loadChats();
  }

  private async resolveCurrentUser() {
    const storedUser = await this.authService.getUser();
    if (storedUser?.id) {
      return storedUser;
    }

    return new Promise<any>((resolve) => {
      this.authService.me().subscribe({
        next: async (res: any) => {
          if (res?.id) {
            await this.authService.setUser(res);
          }
          resolve(res);
        },
        error: () => resolve(null),
      });
    });
  }

  loadChats() {
    this.loading = true;
    this.errorMsg = '';

    this.chatService.list().subscribe({
      next: (res: any) => {
        this.chats = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        if (this.pendingChatId && !this.selectedChat) {
          this.openChat({ id: this.pendingChatId });
        }
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.message || 'No se pudieron cargar los chats';
      },
    }).add(() => {
      this.loading = false;
    });
  }

  openChat(chat: any) {
    if (!chat?.id) {
      return;
    }

    this.errorMsg = '';
    this.successMsg = '';
    this.chatService.get(Number(chat.id)).subscribe({
      next: (res: any) => {
        this.selectedChat = res;
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.message || 'No se pudo abrir el chat';
      },
    });
  }

  closeChat() {
    this.selectedChat = null;
    this.messageBody = '';
  }

  sendMessage() {
    const body = this.messageBody.trim();
    if (!this.selectedChat?.id || !body || this.sending) {
      return;
    }

    this.sending = true;
    this.errorMsg = '';
    this.successMsg = '';

    this.chatService.sendMessage(Number(this.selectedChat.id), body).subscribe({
      next: (message: any) => {
        const messages = Array.isArray(this.selectedChat?.messages) ? this.selectedChat.messages : [];
        this.selectedChat = {
          ...this.selectedChat,
          messages: [...messages, message],
        };
        this.messageBody = '';
        this.successMsg = 'Mensaje enviado';
        this.loadChats();
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.message || 'No se pudo enviar el mensaje';
      },
    }).add(() => {
      this.sending = false;
    });
  }

  chatTitle(chat: any) {
    const users = this.otherParticipants(chat);
    if (!users.length) {
      return 'Chat';
    }
    return users.map((user: any) => user?.name || user?.email || `Usuario #${user?.id || '-'}`).join(', ');
  }

  lastMessage(chat: any) {
    const messages = Array.isArray(chat?.messages) ? chat.messages : [];
    const message = messages[0];
    return message?.body || 'Sin mensajes';
  }

  messageSender(message: any) {
    if (Number(message?.sender_id) === Number(this.currentUser?.id)) {
      return 'Tu';
    }
    return message?.sender?.name || message?.sender?.email || 'Usuario';
  }

  isOwnMessage(message: any) {
    return Number(message?.sender_id) === Number(this.currentUser?.id);
  }

  private otherParticipants(chat: any) {
    const participants = Array.isArray(chat?.participants) ? chat.participants : [];
    return participants
      .map((participant: any) => participant?.user)
      .filter((user: any) => user && Number(user.id) !== Number(this.currentUser?.id));
  }
}
