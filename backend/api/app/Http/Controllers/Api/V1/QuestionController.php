<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Question;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuestionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $questions = Question::query()
            ->with('author:id,name,role,profile')
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->string('category')))
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = '%'.$request->string('search').'%';
                $query->where(fn ($nested) => $nested->where('title', 'like', $term)->orWhere('body', 'like', $term));
            })
            ->latest()
            ->paginate(min($request->integer('per_page', 20), 50));

        return response()->json($questions);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => ['required', 'in:agriculture,livestock,aquaculture,apiculture'],
            'title' => ['required', 'string', 'min:4', 'max:200'],
            'body' => ['required', 'string', 'min:5', 'max:10000'],
            'language' => ['nullable', 'in:fr,mo'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $question = $request->user()->questions()->create([
            ...$validated,
            'language' => $validated['language'] ?? 'fr',
            'status' => 'open',
        ]);

        return response()->json(['data' => $question->load('author:id,name,role,profile')], 201);
    }
}
