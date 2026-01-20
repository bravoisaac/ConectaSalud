<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostComment;
use Illuminate\Http\Request;

class PostCommentController extends Controller
{
    public function store(Request $request, Post $post)
    {
        $data = $request->validate([
            'body' => 'required|string',
        ]);

        $comment = PostComment::create([
            'post_id' => $post->id,
            'user_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        return response()->json($comment, 201);
    }
}
