<?php

namespace App\Http\Controllers;

use App\Models\Company;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    public function index()
    {
        return response()->json(Company::query()->latest()->paginate(20));
    }

    public function show(Company $company)
    {
        return response()->json($company);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->isAdmin() && !$user->hasRole('company')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'rut' => 'required|string|max:20|unique:companies,rut',
            'legal_name' => 'nullable|string|max:255',
        ]);

        $data['user_id'] = $user->id;

        $company = Company::create($data);

        return response()->json($company, 201);
    }

    public function update(Request $request, Company $company)
    {
        $user = $request->user();
        if (!$user->isAdmin() && $company->user_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'rut' => 'sometimes|required|string|max:20|unique:companies,rut,' . $company->id,
            'legal_name' => 'nullable|string|max:255',
            'verification_status' => 'sometimes|string',
        ]);

        $company->update($data);

        return response()->json($company);
    }
}
