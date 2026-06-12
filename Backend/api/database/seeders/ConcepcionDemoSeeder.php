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
use App\Models\Product;
use App\Models\Report;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\VerificationRequest;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ConcepcionDemoSeeder extends Seeder
{
    private const PASSWORD = 'SalutDemo2026!';

    public function run(): void
    {
        $this->truncateAppTables();

        $admin = User::create([
            'name' => 'Admin Salut Demo',
            'email' => 'admin@salutdemo.cl',
            'password' => self::PASSWORD,
            'role' => 'admin',
            'locale' => 'es',
            'phone' => '+56941000000',
            'status' => 'active',
        ]);

        $healthUsers = $this->createHealthUsers();
        $normalUsers = $this->createNormalUsers();
        $companies = $this->createCompanies($admin);
        $jobs = $this->createJobs($companies);

        $this->createApplications($normalUsers, $jobs);
        $bookings = $this->createBookings($normalUsers, $healthUsers);
        $this->createChatsForConfirmedBookings($bookings);
        $this->createReportsAndPosts($normalUsers, $healthUsers);
        $this->createVerificationRequests($healthUsers, $companies);
        $this->createPaymentsAndPenalties($bookings);
        $this->createProducts();
    }

    private function truncateAppTables(): void
    {
        $tables = [
            'personal_access_tokens',
            'payments',
            'penalties',
            'verification_requests',
            'chat_messages',
            'chat_participants',
            'chats',
            'reports',
            'post_likes',
            'post_comments',
            'post_media',
            'posts',
            'bookings',
            'health_availabilities',
            'health_profiles',
            'job_applications',
            'job_posts',
            'companies',
            'user_profiles',
            'products',
            'users',
        ];

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                DB::table($table)->truncate();
            }
        }
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    private function createHealthUsers(): array
    {
        $records = [
            ['Camila Riquelme', 'salud01@salutdemo.cl', '+56941001001', 'TENS cuidados domiciliarios', 6, 24000, 'Concepcion', 'Barros Arana', '1021'],
            ['Matias Figueroa', 'salud02@salutdemo.cl', '+56941001002', 'Kinesiologo musculoesqueletico', 8, 32000, 'San Pedro de la Paz', 'Los Canelos', '845'],
            ['Valentina Soto', 'salud03@salutdemo.cl', '+56941001003', 'Enfermera universitaria', 10, 36000, 'Talcahuano', 'Colon', '621'],
            ['Javiera Munoz', 'salud04@salutdemo.cl', '+56941001004', 'Fonoaudiologa adulto mayor', 5, 28000, 'Chiguayante', 'Orompello', '332'],
            ['Diego Paredes', 'salud05@salutdemo.cl', '+56941001005', 'Terapeuta ocupacional', 7, 30000, 'Hualpen', 'Avenida Alemania', '1570'],
            ['Fernanda Aravena', 'salud06@salutdemo.cl', '+56941001006', 'Nutricionista clinica', 4, 26000, 'Coronel', 'Manuel Montt', '219'],
            ['Ignacio Salazar', 'salud07@salutdemo.cl', '+56941001007', 'Psicologo clinico', 9, 34000, 'Tome', 'Sotomayor', '410'],
            ['Catalina Vera', 'salud08@salutdemo.cl', '+56941001008', 'Medico general', 11, 42000, 'Penco', 'Freire', '735'],
            ['Andres Leiva', 'salud09@salutdemo.cl', '+56941001009', 'TENS adulto mayor', 6, 25000, 'Lota', 'Carlos Cousino', '120'],
            ['Paula Contreras', 'salud10@salutdemo.cl', '+56941001010', 'Kinesiologa respiratoria', 12, 38000, 'Hualqui', 'La Concepcion', '502'],
        ];

        $users = [];
        foreach ($records as $index => [$name, $email, $phone, $specialty, $years, $rate, $comuna, $street, $number]) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => self::PASSWORD,
                'role' => 'health',
                'locale' => 'es',
                'phone' => $phone,
                'status' => 'active',
            ]);

            UserProfile::create([
                'user_id' => $user->id,
                'full_name' => $name,
                'email' => $email,
                'phone' => $phone,
                'address' => "Region del Biobio, {$comuna}, {$street} {$number}",
                'address_region' => 'Biobio',
                'address_comuna' => $comuna,
                'address_city' => $comuna,
                'address_street' => $street,
                'address_number' => $number,
                'profession' => $specialty,
                'summary' => "Profesional de salud con atencion domiciliaria en {$comuna} y comunas cercanas.",
                'experience' => json_encode([
                    ['role' => $specialty, 'place' => 'Red domiciliaria Biobio', 'years' => "{$years} anos"],
                ]),
                'skills' => json_encode(['atencion domiciliaria', 'evaluacion inicial', 'seguimiento familiar']),
                'education' => json_encode([
                    ['degree' => $specialty, 'place' => 'Instituto profesional demo Biobio'],
                ]),
            ]);

            $profile = HealthProfile::create([
                'user_id' => $user->id,
                'specialty' => $specialty,
                'experience_years' => $years,
                'rate_hour' => $rate,
                'location' => "{$comuna}, Region del Biobio",
                'bio' => "Atencion responsable y puntual para pacientes de {$comuna}, Concepcion y alrededores.",
                'verification_status' => $index < 8 ? 'approved' : 'pending',
            ]);

            foreach ([1, 2, 3, 4, 5] as $day) {
                HealthAvailability::create([
                    'health_profile_id' => $profile->id,
                    'day_of_week' => $day,
                    'start_time' => $index % 2 === 0 ? '08:00' : '09:00',
                    'end_time' => $index % 2 === 0 ? '14:00' : '17:00',
                    'timezone' => 'America/Santiago',
                ]);
            }

            $users[] = $user;
        }

        return $users;
    }

    private function createNormalUsers(): array
    {
        $records = [
            ['Daniela Morales', 'usuario01@salutdemo.cl', '+56941002001', 'TENS', 'Concepcion', 'Paicavi', '1840'],
            ['Felipe Cares', 'usuario02@salutdemo.cl', '+56941002002', 'Kinesiologo', 'San Pedro de la Paz', 'Michimalonco', '710'],
            ['Sofia Henriquez', 'usuario03@salutdemo.cl', '+56941002003', 'Enfermera', 'Talcahuano', 'Blanco Encalada', '455'],
            ['Martin Rojas', 'usuario04@salutdemo.cl', '+56941002004', 'Auxiliar de enfermeria', 'Hualpen', 'Gran Bretana', '880'],
            ['Antonia Lagos', 'usuario05@salutdemo.cl', '+56941002005', 'Cuidadora adulto mayor', 'Chiguayante', 'Manuel Rodriguez', '238'],
            ['Sebastian Pino', 'usuario06@salutdemo.cl', '+56941002006', 'Paramedico', 'Coronel', 'Los Carrera', '101'],
            ['Francisca Vidal', 'usuario07@salutdemo.cl', '+56941002007', 'Fonoaudiologa', 'Penco', 'Maipu', '642'],
            ['Nicolas Carrasco', 'usuario08@salutdemo.cl', '+56941002008', 'TENS urgencia', 'Lota', 'Caupolican', '332'],
            ['Constanza Reyes', 'usuario09@salutdemo.cl', '+56941002009', 'Nutricionista', 'Tome', 'Egaña', '220'],
            ['Benjamin Saavedra', 'usuario10@salutdemo.cl', '+56941002010', 'Kinesiologo respiratorio', 'Hualqui', 'Prat', '91'],
        ];

        $users = [];
        foreach ($records as [$name, $email, $phone, $profession, $comuna, $street, $number]) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => self::PASSWORD,
                'role' => 'user',
                'locale' => 'es',
                'phone' => $phone,
                'status' => 'active',
            ]);

            UserProfile::create([
                'user_id' => $user->id,
                'full_name' => $name,
                'email' => $email,
                'phone' => $phone,
                'address' => "Region del Biobio, {$comuna}, {$street} {$number}",
                'address_region' => 'Biobio',
                'address_comuna' => $comuna,
                'address_city' => $comuna,
                'address_street' => $street,
                'address_number' => $number,
                'profession' => $profession,
                'summary' => "Postulante del area salud con disponibilidad para turnos en {$comuna} y Gran Concepcion.",
                'experience' => json_encode([
                    ['role' => $profession, 'place' => 'Centro de salud demo Biobio', 'years' => '2 a 6 anos'],
                ]),
                'skills' => json_encode(['trato al paciente', 'registro clinico', 'trabajo por turnos']),
                'education' => json_encode([
                    ['degree' => $profession, 'place' => 'Institucion de salud demo'],
                ]),
            ]);

            $users[] = $user;
        }

        return $users;
    }

    private function createCompanies(User $admin): array
    {
        $records = [
            ['Clinica Biobio Domiciliaria', '76.410.001-1', 'Clinica Biobio Domiciliaria SpA'],
            ['Centro Kine Andalue', '76.410.002-2', 'Centro Kine Andalue Ltda'],
            ['Red Cuidado Sur', '76.410.003-3', 'Red Cuidado Sur SpA'],
            ['Hogar Clinico Lomas', '76.410.004-4', 'Hogar Clinico Lomas Ltda'],
            ['Salud Movil Gran Concepcion', '76.410.005-5', 'Salud Movil Gran Concepcion SpA'],
        ];

        return array_map(fn ($record) => Company::create([
            'user_id' => $admin->id,
            'name' => $record[0],
            'rut' => $record[1],
            'legal_name' => $record[2],
            'verification_status' => 'approved',
        ]), $records);
    }

    private function createJobs(array $companies): array
    {
        $records = [
            ['TENS turno dia domicilio', 'Concepcion', 'presencial', 620000, 780000],
            ['Kinesiologo respiratorio adulto', 'San Pedro de la Paz', 'presencial', 900000, 1250000],
            ['Enfermera para curaciones avanzadas', 'Talcahuano', 'presencial', 980000, 1320000],
            ['Cuidador adulto mayor noche', 'Chiguayante', 'presencial', 580000, 720000],
            ['Fonoaudiologo visitas domiciliarias', 'Hualpen', 'presencial', 820000, 1100000],
            ['Nutricionista control mensual', 'Coronel', 'presencial', 760000, 980000],
            ['Psicologo clinico teleatencion', 'Concepcion', 'remoto', 850000, 1150000],
            ['TENS apoyo postoperatorio', 'Penco', 'presencial', 650000, 830000],
            ['Kinesiologo musculoesqueletico', 'Tome', 'presencial', 880000, 1200000],
            ['Paramedico apoyo eventos salud', 'Lota', 'presencial', 600000, 760000],
            ['Terapeuta ocupacional infantil', 'Hualqui', 'presencial', 790000, 1050000],
            ['Enfermera coordinadora domiciliaria', 'Concepcion', 'presencial', 1100000, 1450000],
        ];

        $jobs = [];
        foreach ($records as $index => [$title, $location, $modality, $min, $max]) {
            $jobs[] = JobPost::create([
                'company_id' => $companies[$index % count($companies)]->id,
                'title' => $title,
                'description' => "Oficio: {$title}\nUbicacion: {$location}, Region del Biobio\nSe requiere experiencia comprobable, disponibilidad y buen trato con pacientes.",
                'location' => "{$location}, Region del Biobio",
                'modality' => $modality,
                'salary_min' => $min,
                'salary_max' => $max,
                'status' => $index < 10 ? 'open' : 'paused',
                'published_at' => Carbon::now()->subDays($index + 1),
            ]);
        }

        return $jobs;
    }

    private function createApplications(array $users, array $jobs): void
    {
        $statuses = ['applied', 'offered', 'accepted', 'declined', 'rejected'];

        foreach ($users as $index => $user) {
            foreach ([$jobs[$index % count($jobs)], $jobs[($index + 3) % count($jobs)]] as $offset => $job) {
                JobApplication::create([
                    'job_post_id' => $job->id,
                    'user_id' => $user->id,
                    'cover_letter' => "Hola, soy {$user->name}. Tengo experiencia en salud domiciliaria y disponibilidad para {$job->location}.",
                    'status' => $statuses[($index + $offset) % count($statuses)],
                ]);
            }
        }
    }

    private function createBookings(array $normalUsers, array $healthUsers): array
    {
        $bookings = [];
        $statuses = ['requested', 'accepted', 'in_service', 'completed', 'cancelled', 'accepted', 'completed', 'requested'];
        $addresses = [
            ['Concepcion', 'Paicavi', '1840'],
            ['San Pedro de la Paz', 'Los Canelos', '845'],
            ['Talcahuano', 'Colon', '621'],
            ['Chiguayante', 'Orompello', '332'],
            ['Hualpen', 'Avenida Alemania', '1570'],
            ['Coronel', 'Manuel Montt', '219'],
            ['Penco', 'Freire', '735'],
            ['Tome', 'Sotomayor', '410'],
        ];

        foreach ($statuses as $index => $status) {
            $healthProfile = HealthProfile::query()
                ->where('user_id', $healthUsers[$index % count($healthUsers)]->id)
                ->firstOrFail();
            [$city, $street, $number] = $addresses[$index % count($addresses)];
            $startAt = Carbon::now()->addDays($index + 1)->setTime(10 + ($index % 4), 0);

            $bookings[] = Booking::create([
                'health_profile_id' => $healthProfile->id,
                'user_id' => $normalUsers[$index % count($normalUsers)]->id,
                'start_at' => $startAt,
                'end_at' => (clone $startAt)->addHour(),
                'status' => $status,
                'otp_code' => str_pad((string) (123000 + $index), 6, '0', STR_PAD_LEFT),
                'otp_confirmed_at' => in_array($status, ['in_service', 'completed'], true) ? now() : null,
                'total_amount' => $healthProfile->rate_hour,
                'currency' => 'CLP',
                'service_address' => "Region del Biobio, {$city}, {$street} {$number}",
                'service_region' => 'Biobio',
                'service_comuna' => $city,
                'service_city' => $city,
                'service_street' => $street,
                'service_number' => $number,
                'service_lat' => -36.82699 + ($index * 0.015),
                'service_lng' => -73.04977 - ($index * 0.011),
            ]);
        }

        return $bookings;
    }

    private function createChatsForConfirmedBookings(array $bookings): void
    {
        foreach ($bookings as $booking) {
            if (!in_array($booking->status, ['accepted', 'in_service', 'completed'], true)) {
                continue;
            }

            $providerId = HealthProfile::query()
                ->where('id', $booking->health_profile_id)
                ->value('user_id');
            $chat = Chat::create();

            foreach ([$booking->user_id, $providerId] as $userId) {
                ChatParticipant::create([
                    'chat_id' => $chat->id,
                    'user_id' => $userId,
                ]);
            }

            ChatMessage::create([
                'chat_id' => $chat->id,
                'sender_id' => $providerId,
                'body' => 'Hola, confirmo tu reserva. Coordinemos los ultimos detalles por este chat.',
            ]);
            ChatMessage::create([
                'chat_id' => $chat->id,
                'sender_id' => $booking->user_id,
                'body' => 'Gracias, quedo atento a la visita.',
            ]);
        }
    }

    private function createReportsAndPosts(array $normalUsers, array $healthUsers): void
    {
        foreach ($normalUsers as $index => $user) {
            $post = Post::create([
                'user_id' => $user->id,
                'body' => 'Busco recomendaciones de atencion domiciliaria en Gran Concepcion.',
                'status' => 'active',
            ]);

            PostComment::create([
                'post_id' => $post->id,
                'user_id' => $healthUsers[$index % count($healthUsers)]->id,
                'body' => 'Puedo orientar segun el tipo de atencion requerida.',
            ]);

            PostLike::create([
                'post_id' => $post->id,
                'user_id' => $healthUsers[($index + 1) % count($healthUsers)]->id,
            ]);

            if ($index < 5) {
                Report::create([
                    'reporter_id' => $user->id,
                    'target_type' => 'post',
                    'target_id' => $post->id,
                    'reason' => $index % 2 === 0 ? 'Informacion incompleta' : 'Contenido duplicado',
                    'status' => 'open',
                ]);
            }
        }
    }

    private function createVerificationRequests(array $healthUsers, array $companies): void
    {
        foreach (array_slice($healthUsers, 8) as $index => $user) {
            VerificationRequest::create([
                'user_id' => $user->id,
                'role' => 'health',
                'status' => 'pending',
                'payload' => [
                    'full_name' => $user->name,
                    'document_type' => 'certificado_superintendencia',
                    'folio' => 'SALUD-BIO-' . (900 + $index),
                ],
            ]);
        }

        foreach (array_slice($companies, 0, 2) as $company) {
            VerificationRequest::create([
                'user_id' => $company->user_id,
                'role' => 'company',
                'status' => 'approved',
                'payload' => [
                    'company_id' => $company->id,
                    'rut' => $company->rut,
                    'legal_name' => $company->legal_name,
                ],
                'reviewed_by' => $company->user_id,
                'reviewed_at' => now(),
            ]);
        }
    }

    private function createPaymentsAndPenalties(array $bookings): void
    {
        foreach ($bookings as $booking) {
            $providerId = HealthProfile::query()
                ->where('id', $booking->health_profile_id)
                ->value('user_id');

            Payment::create([
                'booking_id' => $booking->id,
                'payer_id' => $booking->user_id,
                'provider_id' => $providerId,
                'amount' => $booking->total_amount,
                'currency' => 'CLP',
                'status' => in_array($booking->status, ['completed'], true) ? 'captured' : 'authorized',
                'platform_fee_percent' => 10,
                'provider_payout_amount' => in_array($booking->status, ['completed'], true) ? round($booking->total_amount * 0.9) : null,
                'payment_provider' => 'demo',
                'provider_reference' => 'PAY-DEMO-' . str_pad((string) $booking->id, 4, '0', STR_PAD_LEFT),
            ]);

            if ($booking->status === 'cancelled') {
                Penalty::create([
                    'booking_id' => $booking->id,
                    'provider_id' => $providerId,
                    'percent' => 20,
                    'status' => 'pending',
                ]);
            }
        }
    }

    private function createProducts(): void
    {
        foreach (['Kit curacion basica', 'Toma presion domiciliaria', 'Control signos vitales'] as $index => $name) {
            Product::create([
                'name' => $name,
                'description' => 'Producto demo para pruebas internas de Salut App.',
                'price' => 5000 + ($index * 3500),
                'fecha' => Carbon::now()->subDays($index),
                'estado_aprobacion' => 'aprobado',
                'estado_proceso' => 'confirmado',
            ]);
        }
    }
}
