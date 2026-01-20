<?php

namespace App\Http\Controllers;

use App\Models\Report;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'target_type' => 'required|string|max:50',
            'target_id' => 'required|integer',
            'reason' => 'required|string|max:255',
        ]);

        $report = Report::create([
            'reporter_id' => $request->user()->id,
            'target_type' => $data['target_type'],
            'target_id' => $data['target_id'],
            'reason' => $data['reason'],
            'status' => 'open',
        ]);

        return response()->json($report, 201);
    }
}
