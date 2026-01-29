<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\ChatParticipant;
use App\Models\Company;
use App\Models\HealthAvailability;
use App\Models\HealthProfile;
use App\Models\JobApplication;
use App\Models\JobPost;
use App\Models\Payment;
use App\Models\Penalty;
use App\Models\Post;
use App\Models\PostComment;
use App\Models\PostLike;
use App\Models\PostMedia;
use App\Models\Product;
use App\Models\Report;
use App\Models\User;
use App\Models\VerificationRequest;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $faker = \Faker\Factory::create('en_US');
        $seedCount = 5;

        $admin = User::firstOrCreate(
            ['email' => 'admin@mitatita.cl'],
            [
                'name' => 'Admin Mi Tatita',
                'password' => 'Password123!',
                'role' => 'admin',
                'locale' => 'es',
                'status' => 'active',
                'phone' => '900000000',
            ]
        );

        $usersByRole = [
            'user' => [],
            'health' => [],
            'company' => [],
        ];

        foreach (array_keys($usersByRole) as $role) {
            for ($i = 0; $i < $seedCount; $i++) {
                $email = $this->uniqueEmail($role);
                $usersByRole[$role][] = User::create([
                    'name' => ucfirst($role) . ' ' . ($i + 1),
                    'email' => $email,
                    'password' => 'Password123!',
                    'role' => $role,
                    'locale' => 'es',
                    'status' => 'active',
                    'phone' => '9' . $faker->numberBetween(10000000, 99999999),
                ]);
            }
        }

        $companies = [];
        foreach ($usersByRole['company'] as $index => $companyUser) {
            $rut = $this->uniqueRut();
            $companies[] = Company::create([
                'user_id' => $companyUser->id,
                'name' => 'Empresa ' . ($index + 1),
                'rut' => $rut,
                'legal_name' => 'Empresa Legal ' . ($index + 1),
                'verification_status' => $faker->randomElement(['pending', 'approved']),
            ]);
        }

        $jobPosts = [];
        $jobRoles = [
            'Enfermera',
            'TENS',
            'Doctor',
            'Kinesiologo',
            'Psicologo',
        ];
        $jobLocations = [
            'Chile, Biobio, Concepcion',
            'Chile, Metropolitana, Santiago',
            'Chile, Valparaiso, Vina del Mar',
            'Chile, Araucania, Temuco',
            'Chile, Los Lagos, Puerto Montt',
        ];
        for ($i = 0; $i < $seedCount; $i++) {
            $company = $companies[$i % count($companies)];
            $role = $jobRoles[$i % count($jobRoles)];
            $location = $jobLocations[$i % count($jobLocations)];
            $jobPosts[] = JobPost::create([
                'company_id' => $company->id,
                'title' => $role,
                'description' => "Oficio: {$role}\nUbicacion: {$location}\nDescripcion de oferta laboral " . ($i + 1),
                'location' => $location,
                'modality' => $faker->randomElement(['presencial', 'remoto']),
                'salary_min' => $faker->numberBetween(400000, 800000),
                'salary_max' => $faker->numberBetween(900000, 1500000),
                'status' => $faker->randomElement(['open', 'paused', 'closed']),
                'published_at' => now()->subDays($faker->numberBetween(1, 30)),
            ]);
        }

        $applicationsCreated = 0;
        $applicationAttempts = 0;
        while ($applicationsCreated < $seedCount && $applicationAttempts < 100) {
            $applicationAttempts++;
            $job = $jobPosts[array_rand($jobPosts)];
            $user = $usersByRole['user'][array_rand($usersByRole['user'])];

            $exists = JobApplication::query()
                ->where('job_post_id', $job->id)
                ->where('user_id', $user->id)
                ->exists();

            if ($exists) {
                continue;
            }

            JobApplication::create([
                'job_post_id' => $job->id,
                'user_id' => $user->id,
                'cover_letter' => 'Carta de presentacion ' . $applicationsCreated,
                'status' => 'applied',
            ]);
            $applicationsCreated++;
        }

        $healthProfiles = [];
        foreach ($usersByRole['health'] as $index => $healthUser) {
            $healthProfiles[] = HealthProfile::create([
                'user_id' => $healthUser->id,
                'specialty' => $faker->randomElement(['Enfermeria', 'Kinesiologia', 'Psicologia', 'Medicina general']),
                'experience_years' => $faker->numberBetween(1, 15),
                'rate_hour' => $faker->numberBetween(15000, 45000),
                'location' => $faker->city,
                'bio' => 'Perfil profesional ' . ($index + 1),
                'verification_status' => $faker->randomElement(['pending', 'approved']),
            ]);
        }

        for ($i = 0; $i < $seedCount; $i++) {
            $profile = $healthProfiles[$i % count($healthProfiles)];
            $startHour = $faker->numberBetween(8, 16);
            $endHour = $startHour + 2;

            HealthAvailability::create([
                'health_profile_id' => $profile->id,
                'day_of_week' => $faker->numberBetween(1, 5),
                'start_time' => sprintf('%02d:00', $startHour),
                'end_time' => sprintf('%02d:00', $endHour),
                'timezone' => 'America/Santiago',
            ]);
        }

        $bookings = [];
        for ($i = 0; $i < $seedCount; $i++) {
            $profile = $healthProfiles[$i % count($healthProfiles)];
            $user = $usersByRole['user'][$i % count($usersByRole['user'])];
            $startAt = Carbon::now()->addDays($faker->numberBetween(1, 10))->setTime($faker->numberBetween(8, 18), 0);
            $endAt = (clone $startAt)->addMinutes(60);

            $status = $faker->randomElement(['requested', 'accepted', 'in_service', 'completed']);
            $otpConfirmed = in_array($status, ['in_service', 'completed'], true) ? now() : null;

            $bookings[] = Booking::create([
                'health_profile_id' => $profile->id,
                'user_id' => $user->id,
                'start_at' => $startAt,
                'end_at' => $endAt,
                'status' => $status,
                'otp_code' => str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT),
                'otp_confirmed_at' => $otpConfirmed,
                'total_amount' => $faker->numberBetween(20000, 60000),
                'currency' => 'CLP',
            ]);
        }

        $posts = [];
        for ($i = 0; $i < $seedCount; $i++) {
            $author = $usersByRole['user'][$i % count($usersByRole['user'])];
            $posts[] = Post::create([
                'user_id' => $author->id,
                'body' => 'Publicacion de prueba ' . ($i + 1),
                'status' => 'active',
            ]);
        }

        for ($i = 0; $i < $seedCount; $i++) {
            $post = $posts[$i % count($posts)];
            $type = $faker->randomElement(['image', 'video']);

            PostMedia::create([
                'post_id' => $post->id,
                'media_type' => $type,
                'url' => 'https://example.com/media/' . Str::random(12),
                'size_mb' => $faker->randomFloat(2, 1, 10),
                'duration_seconds' => $type === 'video' ? $faker->numberBetween(10, 120) : null,
            ]);
        }

        for ($i = 0; $i < $seedCount; $i++) {
            $post = $posts[$i % count($posts)];
            $user = $usersByRole['user'][($i + 3) % count($usersByRole['user'])];

            PostComment::create([
                'post_id' => $post->id,
                'user_id' => $user->id,
                'body' => 'Comentario de prueba ' . ($i + 1),
            ]);
        }

        $likesCreated = 0;
        $likesAttempts = 0;
        while ($likesCreated < $seedCount && $likesAttempts < 100) {
            $likesAttempts++;
            $post = $posts[array_rand($posts)];
            $user = $usersByRole['user'][array_rand($usersByRole['user'])];

            $exists = PostLike::query()
                ->where('post_id', $post->id)
                ->where('user_id', $user->id)
                ->exists();

            if ($exists) {
                continue;
            }

            PostLike::create([
                'post_id' => $post->id,
                'user_id' => $user->id,
            ]);
            $likesCreated++;
        }

        for ($i = 0; $i < $seedCount; $i++) {
            $reporter = $usersByRole['user'][$i % count($usersByRole['user'])];
            $targetType = $faker->randomElement(['post', 'comment', 'user']);
            $targetId = match ($targetType) {
                'post' => $posts[$i % count($posts)]->id,
                'comment' => PostComment::query()->inRandomOrder()->value('id') ?? 1,
                'user' => $usersByRole['user'][$i % count($usersByRole['user'])]->id,
                default => 1,
            };

            Report::create([
                'reporter_id' => $reporter->id,
                'target_type' => $targetType,
                'target_id' => $targetId,
                'reason' => $faker->randomElement(['spam', 'abuso', 'contenido inapropiado']),
                'status' => 'open',
            ]);
        }

        $chats = [];
        for ($i = 0; $i < $seedCount; $i++) {
            $chat = Chat::create();
            $participant = $usersByRole['user'][$i % count($usersByRole['user'])];
            ChatParticipant::create([
                'chat_id' => $chat->id,
                'user_id' => $participant->id,
            ]);
            $chats[] = $chat;
        }

        for ($i = 0; $i < $seedCount; $i++) {
            $chat = $chats[$i % count($chats)];
            $senderId = ChatParticipant::query()
                ->where('chat_id', $chat->id)
                ->value('user_id');

            ChatMessage::create([
                'chat_id' => $chat->id,
                'sender_id' => $senderId,
                'body' => 'Mensaje de prueba ' . ($i + 1),
                'attachment_url' => $i % 3 === 0 ? 'https://example.com/attach/' . Str::random(8) : null,
                'attachment_type' => $i % 3 === 0 ? 'image' : null,
            ]);
        }

        for ($i = 0; $i < $seedCount; $i++) {
            $role = $faker->randomElement(['health', 'company']);
            $user = $usersByRole[$role][$i % count($usersByRole[$role])];

            VerificationRequest::create([
                'user_id' => $user->id,
                'role' => $role,
                'status' => 'pending',
                'payload' => [
                    'rut' => $this->uniqueRut(),
                    'full_name' => $user->name,
                    'document' => 'DOC' . Str::random(8),
                ],
            ]);
        }

        for ($i = 0; $i < $seedCount; $i++) {
            $booking = $bookings[$i % count($bookings)];
            $providerId = HealthProfile::query()
                ->where('id', $booking->health_profile_id)
                ->value('user_id');

            Payment::create([
                'booking_id' => $booking->id,
                'payer_id' => $booking->user_id,
                'provider_id' => $providerId,
                'amount' => $booking->total_amount,
                'currency' => $booking->currency,
                'status' => 'authorized',
                'platform_fee_percent' => 10,
                'payment_provider' => 'demo',
                'provider_reference' => Str::random(12),
            ]);
        }

        for ($i = 0; $i < $seedCount; $i++) {
            $booking = $bookings[$i % count($bookings)];
            $providerId = HealthProfile::query()
                ->where('id', $booking->health_profile_id)
                ->value('user_id');

            Penalty::create([
                'booking_id' => $booking->id,
                'provider_id' => $providerId,
                'percent' => 20,
                'status' => 'pending',
            ]);
        }

        for ($i = 0; $i < $seedCount; $i++) {
            Product::create([
                'name' => 'Producto ' . ($i + 1),
                'description' => 'Descripcion de producto ' . ($i + 1),
                'price' => $faker->numberBetween(5000, 50000),
                'fecha' => Carbon::now()->subDays($faker->numberBetween(0, 30)),
                'estado_aprobacion' => $faker->randomElement(['pendiente', 'aprobado', 'rechazado']),
                'estado_proceso' => $faker->randomElement(['en_proceso', 'confirmado']),
            ]);
        }
    }

    private function uniqueEmail(string $role): string
    {
        do {
            $email = $role . '+' . Str::lower(Str::random(8)) . '@example.com';
        } while (User::query()->where('email', $email)->exists());

        return $email;
    }

    private function uniqueRut(): string
    {
        do {
            $number = random_int(10000000, 99999999);
            $digit = (string) random_int(0, 9);
            $rut = $number . '-' . $digit;
        } while (Company::query()->where('rut', $rut)->exists());

        return $rut;
    }
}
