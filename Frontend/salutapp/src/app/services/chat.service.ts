import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatService {
  constructor(private http: HttpClient) {}

  list() {
    return this.http.get(`${environment.apiBase}/chats`);
  }

  create(participantIds: number[]) {
    return this.http.post(`${environment.apiBase}/chats`, {
      participant_ids: participantIds,
    });
  }

  sendMessage(chatId: number, body?: string, attachmentUrl?: string, attachmentType?: string) {
    return this.http.post(`${environment.apiBase}/chats/${chatId}/messages`, {
      body: body || null,
      attachment_url: attachmentUrl || null,
      attachment_type: attachmentType || null,
    });
  }
}
