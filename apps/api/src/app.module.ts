import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { CacheModule } from './cache/cache.module';
import { MetricsModule } from './metrics/metrics.module';
import { IdentityModule } from './modules/identity/identity.module';
import { PrismaModule } from './prisma/prisma.module';
import { CourseModule } from './modules/course/course.module';
import { LessonModule } from './modules/lesson/lesson.module';
import { ExerciseModule } from './modules/exercise/exercise.module';
import { ModuleModule } from './modules/module/module.module';
import { GameModule } from './modules/game/game.module';
import { ProgressModule } from './modules/progress/progress.module';
import { TranslateModule } from './modules/translate/translate.module';
import { ConfigModule } from '@nestjs/config';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AvatarModule } from './modules/game/avatar/avatar.module';
import { ItemsModule } from './modules/game/items/items.module';
import { AnimationsModule } from './modules/game/animations/animations.module';
import { ItemSpritesModule } from './modules/game/item-sprites/item-sprites.module';
import { LayoutsModule } from './modules/game/layouts/layouts.module';
import { WorldItemDataModule } from './modules/game/world-item-data/world-item-data.module';
import { AcademiesModule } from './modules/academies/academies.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PaddleWebhookModule } from './modules/paddle/paddle-webhook.module';
import { CoinsModule } from './modules/coins/coins.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { AdminModule } from './modules/admin/admin.module';
import { RankingsModule } from './modules/rankings/rankings.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { FriendshipsModule } from './modules/friendships/friendships.module';
import { FriendChallengesModule } from './modules/friend-challenges/friend-challenges.module';
import { MessagesModule } from './modules/messages/messages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EmailModule } from './modules/email/email.module';
import { CommunityModule } from './modules/community/community.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { BadgesModule } from './modules/badges/badges.module';
import { ThemeAssetsModule } from './modules/theme-assets/theme-assets.module';
import { CodeStudioModule } from './modules/codestudio/codestudio.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { LearningPathsModule } from './modules/learning-paths/learning-paths.module';
import { CourseCategoriesModule } from './modules/course-categories/course-categories.module';
import { CourseReviewsModule } from './modules/course-reviews/course-reviews.module';
import { CourseProjectsModule } from './modules/course-projects/course-projects.module';
import { ContentDiscussionModule } from './modules/content-discussion/content-discussion.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Límite genérico por IP para toda la API HTTP (no cubre WebSockets, que
    // no tienen ningún rate limiting hoy). Antes no existía nada acá: login,
    // registro y subida de archivos eran atacables por fuerza bruta/volumen
    // sin ninguna fricción.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    CacheModule,
    MetricsModule,
    IdentityModule,
    ModuleModule,
    CourseModule,
    LessonModule,
    ExerciseModule,
    GameModule,
    ProgressModule,
    TranslateModule,
    UploadsModule,
    AvatarModule,
    ItemsModule,
    AnimationsModule,
    ItemSpritesModule,
    LayoutsModule,
    WorldItemDataModule,
    AcademiesModule,
    CertificatesModule,
    PaymentsModule,
    SubscriptionsModule,
    PricingModule,
    LearningPathsModule,
    CourseCategoriesModule,
    CourseReviewsModule,
    CourseProjectsModule,
    ContentDiscussionModule,
    PaddleWebhookModule,
    CoinsModule,
    WebhooksModule,
    ReconciliationModule,
    AdminModule,
    RankingsModule,
    RealtimeModule,
    NotificationsModule,
    ProfilesModule,
    FriendshipsModule,
    FriendChallengesModule,
    MessagesModule,
    EmailModule,
    CommunityModule,
    ReferralsModule,
    GamificationModule,
    MarketplaceModule,
    BadgesModule,
    ThemeAssetsModule,
    CodeStudioModule,
  ],
  // AppController/HealthController: AppController nunca había estado
  // registrado acá (solo lo instanciaba su propio spec vía TestingModule,
  // así que la ruta "/" jamás existió en la app real). BE5: tampoco había
  // ningún /health.
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
