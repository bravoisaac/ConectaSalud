import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PostsService {
  constructor(private http: HttpClient) {}

  list() {
    return this.http.get(`${environment.apiBase}/posts`);
  }

  create(body: string) {
    return this.http.post(`${environment.apiBase}/posts`, { body });
  }

  comment(postId: number, body: string) {
    return this.http.post(`${environment.apiBase}/posts/${postId}/comments`, { body });
  }

  like(postId: number) {
    return this.http.post(`${environment.apiBase}/posts/${postId}/likes`, {});
  }

  unlike(postId: number) {
    return this.http.delete(`${environment.apiBase}/posts/${postId}/likes`);
  }
}
