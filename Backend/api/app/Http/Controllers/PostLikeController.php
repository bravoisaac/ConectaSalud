<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostLike;
use Illuminate\Http\Request;

class PostLikeController extends Controller
{
    public function store(Request $request, Post $post)
    {
        $like = PostLike::firstOrCreate([
            'post_id' => $post->id,
            'user_id' => $request->user()->id,
        ]);

        return response()->json($like, 201);
    }

    public function destroy(Request $request, Post $post)
    {
        PostLike::query()
            ->where('post_id', $post->id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['deleted' => true]);
    }
}
