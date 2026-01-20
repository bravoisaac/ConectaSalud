import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class ChatPage implements OnInit {
  chats: any[] = [];
  loading = false;
  errorMsg = '';

  participantsInput = '';
  chatIdForMessage: number | null = null;
  messageBody = '';
  attachmentUrl = '';
  attachmentType = '';
  successMsg = '';

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    this.loadChats();
  }

  loadChats() {
    this.loading = true;
    this.errorMsg = '';

    this.chatService.list().subscribe({
      next: (res: any) => {
        this.chats = res?.data ? res.data : res;
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar chats';
      }
    }).add(() => {
      this.loading = false;
    });
  }

  createChat() {
    this.successMsg = '';
    const ids = this.participantsInput
      .split(',')
      .map(value => Number(value.trim()))
      .filter(value => Number.isInteger(value) && value > 0);

    if (!ids.length) {
      this.errorMsg = 'Ingresa IDs de participantes';
      return;
    }

    this.chatService.create(ids).subscribe({
      next: (res: any) => {
        this.participantsInput = '';
        this.chatIdForMessage = res?.id || null;
        this.loadChats();
        this.successMsg = 'Chat creado';
      },
      error: () => {
        this.errorMsg = 'No se pudo crear chat';
      }
    });
  }

  sendMessage() {
    this.successMsg = '';
    if (!this.chatIdForMessage) {
      this.errorMsg = 'Indica un chat';
      return;
    }

    this.chatService
      .sendMessage(this.chatIdForMessage, this.messageBody, this.attachmentUrl, this.attachmentType)
      .subscribe({
        next: () => {
          this.messageBody = '';
          this.attachmentUrl = '';
          this.attachmentType = '';
          this.successMsg = 'Mensaje enviado';
        },
        error: () => {
          this.errorMsg = 'No se pudo enviar el mensaje';
        }
      });
  }
}
