<?php

namespace App\Http\Controllers;

use App\Models\Chat;
use App\Models\ChatMessage;
use Illuminate\Http\Request;

class ChatMessageController extends Controller
{
    public function store(Request $request, Chat $chat)
    {
        $user = $request->user();
        $isParticipant = \App\Models\ChatParticipant::query()
            ->where('chat_id', $chat->id)
            ->where('user_id', $user->id)
            ->exists();

        if (!$isParticipant && !$user->isAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'body' => 'nullable|string',
            'attachment_url' => 'nullable|string|max:255',
            'attachment_type' => 'nullable|string|max:50',
        ]);

        if (empty($data['body']) && empty($data['attachment_url'])) {
            return response()->json(['message' => 'Mensaje vacio'], 422);
        }

        $message = ChatMessage::create([
            'chat_id' => $chat->id,
            'sender_id' => $user->id,
            'body' => $data['body'] ?? null,
            'attachment_url' => $data['attachment_url'] ?? null,
            'attachment_type' => $data['attachment_type'] ?? null,
        ]);

        $message->load('sender:id,name,email');

        return response()->json($message, 201);
    }
}
