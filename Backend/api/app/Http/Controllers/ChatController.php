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
            ->with([
                'participants.user:id,name,email,role',
                'messages' => fn ($q) => $q->latest()->limit(1),
                'messages.sender:id,name,email',
            ])
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

        $chat->load([
            'participants.user:id,name,email,role',
            'messages' => fn ($q) => $q->oldest(),
            'messages.sender:id,name,email',
        ]);

        return response()->json($chat);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'participant_ids' => 'required|array|min:1',
            'participant_ids.*' => 'integer|exists:users,id',
        ]);

        $participantIds = array_unique(array_merge(
            $data['participant_ids'],
            [$request->user()->id]
        ));

        sort($participantIds);

        if (count($participantIds) === 2) {
            $candidateChatIds = ChatParticipant::query()
                ->whereIn('user_id', $participantIds)
                ->select('chat_id')
                ->groupBy('chat_id')
                ->havingRaw('COUNT(DISTINCT user_id) = ?', [2])
                ->pluck('chat_id');

            foreach ($candidateChatIds as $candidateChatId) {
                $count = ChatParticipant::query()
                    ->where('chat_id', $candidateChatId)
                    ->count();

                if ($count === 2) {
                    $chat = Chat::find($candidateChatId);
                    $chat?->load([
                        'participants.user:id,name,email,role',
                        'messages' => fn ($q) => $q->oldest(),
                        'messages.sender:id,name,email',
                    ]);
                    return response()->json($chat);
                }
            }
        }

        $chat = Chat::create();

        foreach ($participantIds as $participantId) {
            ChatParticipant::create([
                'chat_id' => $chat->id,
                'user_id' => $participantId,
            ]);
        }

        $chat->load([
            'participants.user:id,name,email,role',
            'messages' => fn ($q) => $q->oldest(),
            'messages.sender:id,name,email',
        ]);

        return response()->json($chat, 201);
    }
}
