import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { PostsService } from '../../services/posts.service';

@Component({
  selector: 'app-social',
  templateUrl: './social.page.html',
  styleUrls: ['./social.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class SocialPage implements OnInit {
  newPost = '';
  posts: any[] = [];
  loading = false;
  errorMsg = '';

  constructor(private postsService: PostsService) {}

  ngOnInit() {
    this.loadPosts();
  }

  loadPosts() {
    this.loading = true;
    this.errorMsg = '';

    this.postsService.list().subscribe({
      next: (res: any) => {
        this.posts = res?.data ? res.data : res;
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar publicaciones';
      }
    }).add(() => {
      this.loading = false;
    });
  }

  publish() {
    const body = this.newPost.trim();
    if (!body) {
      this.errorMsg = 'Escribe un mensaje';
      return;
    }

    this.postsService.create(body).subscribe({
      next: () => {
        this.newPost = '';
        this.loadPosts();
      },
      error: () => {
        this.errorMsg = 'No se pudo publicar';
      }
    });
  }
}
