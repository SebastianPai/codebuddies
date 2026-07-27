import { Module } from '@nestjs/common';
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
import { AppsModule } from './game/apps/app.module';
import { LayoutsModule } from './modules/game/layouts/layouts.module';
import { WorldItemDataModule } from './modules/game/world-item-data/world-item-data.module';
import { AcademiesModule } from './modules/academies/academies.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AdminModule } from './modules/admin/admin.module';
import { RankingsModule } from './modules/rankings/rankings.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { FriendshipsModule } from './modules/friendships/friendships.module';
import { MessagesModule } from './modules/messages/messages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EmailModule } from './modules/email/email.module';
import { CommunityModule } from './modules/community/community.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { BadgesModule } from './modules/badges/badges.module';
import { CodeStudioModule } from './modules/codestudio/codestudio.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
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
    AppsModule,
    LayoutsModule,
    WorldItemDataModule,
    AcademiesModule,
    CertificatesModule,
    PaymentsModule,
    SubscriptionsModule,
    AdminModule,
    RankingsModule,
    RealtimeModule,
    NotificationsModule,
    ProfilesModule,
    FriendshipsModule,
    MessagesModule,
    EmailModule,
    CommunityModule,
    ReferralsModule,
    GamificationModule,
    MarketplaceModule,
    BadgesModule,
    CodeStudioModule,
  ],
})
export class AppModule {}
