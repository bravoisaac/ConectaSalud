<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->redirectGuestsTo(function (Request $request): ?string {
            return $request->is('api/*') ? null : route('login');
        });
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $isApiRequest = fn (Request $request): bool => $request->is('api/*') || $request->expectsJson();

        $exceptions->shouldRenderJsonWhen(function (Request $request, Throwable $e) use ($isApiRequest): bool {
            return $isApiRequest($request);
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) use ($isApiRequest) {
            if (! $isApiRequest($request)) {
                return null;
            }

            return response()->json([
                'message' => 'No autenticado.',
            ], SymfonyResponse::HTTP_UNAUTHORIZED);
        });

        $exceptions->render(function (ValidationException $e, Request $request) use ($isApiRequest) {
            if (! $isApiRequest($request)) {
                return null;
            }

            return response()->json([
                'message' => 'Los datos enviados no son validos.',
                'errors' => $e->errors(),
            ], $e->status);
        });

        $exceptions->render(function (HttpExceptionInterface $e, Request $request) use ($isApiRequest) {
            if (! $isApiRequest($request)) {
                return null;
            }

            $status = $e->getStatusCode();
            $message = match (true) {
                $e instanceof NotFoundHttpException => 'Recurso no encontrado.',
                $e instanceof MethodNotAllowedHttpException => 'Metodo no permitido.',
                $e instanceof TooManyRequestsHttpException => 'Demasiados intentos. Intenta nuevamente mas tarde.',
                $status === SymfonyResponse::HTTP_UNAUTHORIZED => 'No autenticado.',
                $status === SymfonyResponse::HTTP_FORBIDDEN => 'No autorizado.',
                default => $e->getMessage() ?: (SymfonyResponse::$statusTexts[$status] ?? 'Error de solicitud.'),
            };

            return response()->json([
                'message' => $message,
            ], $status, $e->getHeaders());
        });

        $exceptions->render(function (Throwable $e, Request $request) use ($isApiRequest) {
            if (! $isApiRequest($request)) {
                return null;
            }

            $payload = [
                'message' => 'Error interno del servidor.',
            ];

            if (config('app.debug')) {
                $payload['exception'] = $e::class;
                $payload['detail'] = $e->getMessage();
            }

            return response()->json($payload, SymfonyResponse::HTTP_INTERNAL_SERVER_ERROR);
        });
    })->create();
