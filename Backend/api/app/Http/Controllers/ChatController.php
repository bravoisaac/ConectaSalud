<?php

namespace App\Http\Controllers;

use App\Models\Chat;
use App\Models\ChatParticipant;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function index(Request $request)
    {
        $chatIds = ChatParticipant::query()
            ->where('user_id', $request->user()->id)
            ->pluck('chat_id');

        $chats = Chat::query()
            ->whereIn('id', $chatIds)
            ->latest()
            ->paginate(20);

        return response()->json($chats);
    }

    public function show(Chat $chat)
    {
        $user = request()->user();
        $isParticipant = ChatParticipant::query()
            ->where('chat_id', $chat->id)
            ->where('user_id', $user->id)
            ->exists();

        if (!$isParticipant && !$user->isAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return response()->json($chat);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'participant_ids' => 'required|array|min:1',
            'participant_ids.*' => 'integer|exists:users,id',
        ]);

        $chat = Chat::create();

        $participantIds = array_unique(array_merge(
            $data['participant_ids'],
            [$request->user()->id]
        ));

        foreach ($participantIds as $participantId) {
            ChatParticipant::create([
                'chat_id' => $chat->id,
                'user_id' => $participantId,
            ]);
        }

        return response()->json($chat, 201);
    }
}
