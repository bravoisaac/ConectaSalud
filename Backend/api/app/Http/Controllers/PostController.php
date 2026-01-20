<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Request;

class PostController extends Controller
{
    public function index()
    {
        return response()->json(Post::query()->latest()->paginate(20));
    }

    public function show(Post $post)
    {
        return response()->json($post);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'body' => 'required|string',
        ]);

        $post = Post::create([
            'user_id' => $request->user()->id,
            'body' => $data['body'],
            'status' => 'active',
        ]);

        return response()->json($post, 201);
    }

    public function destroy(Post $post)
    {
        $user = request()->user();
        if (!$user->isAdmin() && $post->user_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $post->delete();

        return response()->json(['deleted' => true]);
    }
}
