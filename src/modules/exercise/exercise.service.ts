// apps/api/src/modules/exercise/exercise.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as vm from 'node:vm';
import { PrismaService } from '../../prisma/prisma.service';
import { ReorderDto } from '../../common/dto/reorder.dto';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { SubmitQuizAnswerDto } from './dto/submit-quiz-answer.dto';
import { SubmitCodeAnswerDto } from './dto/submit-code-answer.dto';
import { ExerciseType, Prisma, Role } from '@prisma/client';
import { ProgressService } from '../progress/progress.service';
import { PremiumAccessService } from '../premium-access/premium-access.service';
import {
  Exercise,
  BaseExercise,
  CodingExercise,
  LiveExercise,
  QuizExercise,
  QuizQuestion,
} from './types/exercise.interface';

type AdminExercisePayload = Prisma.ExerciseGetPayload<{
  include: {
    translations: { include: { language: true } };
    lesson: {
      include: {
        translations: { include: { language: true } };
        course: {
          include: {
            translations: { include: { language: true } };
          };
        };
      };
    };
  };
}>;

@Injectable()
export class ExerciseService {
  constructor(
    private prisma: PrismaService,
    private progressService: ProgressService,
    private readonly premiumAccessService: PremiumAccessService,
  ) {}

  // Extrae las preguntas "crudas" (con la respuesta correcta incluida) del
  // contenido de un ejercicio QUIZ. Uso interno únicamente — nunca se
  // devuelve directamente a un controlador; ver buildQuizQuestions() para la
  // versión sanitizada que sí viaja al cliente, y submitQuizAnswer() para la
  // corrección server-side que sí necesita esta respuesta cruda.
  private extractQuizBlocks(content: any): any[] {
    if (Array.isArray(content?.questions)) {
      return content.questions;
    }

    const instructionElements = content?.instructionElements || [];
    return instructionElements
      .filter((el: any) => el.type === 'quiz')
      .flatMap((el: any) => el.value || []);
  }

  // Las respuestas correctas (y su explicación) solo viajan al cliente una
  // vez que el usuario ya completó el ejercicio — antes de eso, exponerlas
  // permite ver todas las respuestas inspeccionando la red del navegador.
  // Responder un quiz por primera vez pasa por submitQuizAnswer(), que
  // corrige server-side y nunca expone el resto de respuestas correctas.
  private buildQuizQuestions(
    quizBlocks: any[],
    exerciseId: string,
    completed: boolean,
  ): QuizQuestion[] {
    return quizBlocks.map((q: any, index: number) => ({
      id: `${exerciseId}-q${index}`,
      question: q.question || 'Pregunta sin texto',
      options: q.options || [],
      correct: completed && Array.isArray(q.correct) ? q.correct : [],
      isMultiple: q.isMultiple ?? false,
      explanation: completed ? q.explanation || '' : '',
    }));
  }

  // Crear ejercicio
  async createExercise(dto: CreateExerciseDto) {
    let order = dto.order;
    if (!order) {
      const maxOrder = await this.prisma.exercise.aggregate({
        where: { lessonId: dto.lessonId },
        _max: { order: true },
      });
      order = (maxOrder._max.order || 0) + 1;
    }

    return this.prisma.exercise.create({
      data: {
        lesson: { connect: { id: dto.lessonId } },
        type: dto.type,
        status: dto.status,
        codes: dto.codes as unknown as Prisma.InputJsonValue,
        experience: dto.experience ?? 10,
        coins: dto.coins ?? 5,
        order,
        translations: {
          create: dto.translations.map((t) => ({
            language: { connect: { code: t.languageCode } },
            title: t.title,
            description: t.description,
            content: (t.content as Prisma.InputJsonValue) ?? undefined,
          })),
        },
      },
      include: {
        translations: { include: { language: true } },
      },
    });
  }

  // Obtener ejercicios por lección con estado "completed" y tipado
  async getExercisesByLesson(
    lessonId: string,
    userId?: string,
    lang: string = 'es',
    role?: Role,
  ): Promise<Exercise[]> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        order: true,
        courseId: true,
        course: { select: { freeLimit: true } },
      },
    });
    if (!lesson) throw new NotFoundException('Lección no encontrada');

    const locked = await this.premiumAccessService.isLessonLocked({
      courseId: lesson.courseId,
      lessonOrder: lesson.order,
      freeLimit: lesson.course.freeLimit,
      userId,
      role,
    });

    const isAdmin = role === Role.ADMIN;
    const exercises = await this.prisma.exercise.findMany({
      where: isAdmin ? { lessonId } : { lessonId, status: 'PUBLISHED' },
      orderBy: { order: 'asc' },
      include: { translations: { include: { language: true } } },
    });

    // Traer los completados por este usuario
    let completedIds: string[] = [];
    if (userId) {
      const completions = await this.prisma.completion.findMany({
        where: { userId, lessonId },
        select: { exerciseId: true },
      });
      completedIds = completions
        .map((c) => c.exerciseId)
        .filter(Boolean) as string[];
    }

    return exercises.map((ex) => {
      const translation =
        ex.translations.find((t) => t.language.code === lang) ||
        ex.translations.find((t) => t.language.code === 'es') ||
        ex.translations[0];

      const base: BaseExercise = {
        id: ex.id,
        lessonId: ex.lessonId,
        order: ex.order,
        title: translation?.title ?? null,
        description: translation?.description ?? null,
        experience: completedIds.includes(ex.id) ? ex.experience : 0,
        coins: completedIds.includes(ex.id) ? ex.coins : 0,
        completed: completedIds.includes(ex.id),
        locked,
      };

      switch (ex.type) {
        case ExerciseType.CODE:
          const code: CodingExercise = {
            ...base,
            type: 'CODE',
            starterCode: locked ? '' : (ex.codes?.[0]?.initialCode ?? ''),
            solutionCode: locked ? '' : (ex.codes?.[0]?.expectedCode ?? ''),
            language: ex.codes?.[0]?.language ?? 'js',
          };
          return code;

        case ExerciseType.QUIZ: {
          const rawContent = translation?.content || ex.content || {};
          const quizBlocks = locked ? [] : this.extractQuizBlocks(rawContent);
          const questions = this.buildQuizQuestions(
            quizBlocks,
            ex.id,
            base.completed,
          );

          const quiz: QuizExercise = {
            ...base,
            type: 'QUIZ',
            questions,
          };
          return quiz;
        }

        case ExerciseType.LIVE:
          const live: LiveExercise = {
            ...base,
            type: 'LIVE',
            schedule: locked ? '' : (ex.codes?.[0]?.schedule ?? ''),
            link: locked ? '' : (ex.codes?.[0]?.link ?? ''),
          };
          return live;

        default:
          return {
            ...base,
            type: 'CODE',
            starterCode: '',
            solutionCode: '',
            language: 'js',
          } as CodingExercise;
      }
    });
  }

  // Obtener ejercicio individual
  async getExerciseById(
    id: string,
    userId?: string,
    lang: string = 'es',
    role?: Role,
  ): Promise<Exercise> {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: {
        translations: { include: { language: true } },
        lesson: {
          select: {
            order: true,
            courseId: true,
            course: { select: { freeLimit: true } },
          },
        },
      },
    });

    if (!exercise || (exercise.status !== 'PUBLISHED' && role !== Role.ADMIN)) {
      throw new NotFoundException('Ejercicio no encontrado');
    }

    let completed = false;
    if (userId) {
      const completion = await this.prisma.completion.findFirst({
        where: { userId, exerciseId: id },
      });
      completed = !!completion;
    }

    const locked = await this.premiumAccessService.isLessonLocked({
      courseId: exercise.lesson.courseId,
      lessonOrder: exercise.lesson.order,
      freeLimit: exercise.lesson.course.freeLimit,
      userId,
      role,
    });

    const translation =
      exercise.translations.find((t) => t.language.code === lang) ||
      exercise.translations.find((t) => t.language.code === 'es') ||
      exercise.translations[0];

    const base: BaseExercise = {
      id: exercise.id,
      lessonId: exercise.lessonId,
      order: exercise.order,
      title: translation?.title ?? null,
      description: translation?.description ?? null,
      experience: completed ? exercise.experience : 0,
      coins: completed ? exercise.coins : 0,
      completed,
      locked,
      status: exercise.status,
    };

    switch (exercise.type) {
      case ExerciseType.QUIZ: {
        const rawContent = translation?.content || exercise.content || {};
        const quizBlocks = locked ? [] : this.extractQuizBlocks(rawContent);
        const questions = this.buildQuizQuestions(
          quizBlocks,
          exercise.id,
          base.completed,
        );

        const quiz: QuizExercise = {
          ...base,
          type: 'QUIZ',
          questions,
        };
        return quiz;
      }

      case ExerciseType.CODE:
        return {
          ...base,
          type: 'CODE',
          starterCode: locked ? '' : (exercise.codes?.[0]?.initialCode ?? ''),
          solutionCode: locked
            ? ''
            : (exercise.codes?.[0]?.expectedCode ?? ''),
          language: exercise.codes?.[0]?.language ?? 'js',
          translations: locked ? [] : exercise.translations,
        } as CodingExercise & { translations: any[] };

      case ExerciseType.LIVE:
        return {
          ...base,
          type: 'LIVE',
          schedule: locked ? '' : (exercise.codes?.[0]?.schedule ?? ''),
          link: locked ? '' : (exercise.codes?.[0]?.link ?? ''),
        } as LiveExercise;

      default:
        return {
          ...base,
          type: 'CODE',
          starterCode: '',
          solutionCode: '',
          language: 'js',
        } as CodingExercise;
    }
  }

  // Corrige una respuesta de quiz server-side: la respuesta correcta nunca
  // se envía al cliente antes de este punto (ver buildQuizQuestions), así
  // que la comparación tiene que resolverse acá, no en el navegador.
  async submitQuizAnswer(
    userId: string,
    exerciseId: string,
    dto: SubmitQuizAnswerDto,
    role?: Role,
  ) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        translations: { include: { language: true } },
        lesson: {
          select: {
            order: true,
            courseId: true,
            course: { select: { freeLimit: true } },
          },
        },
      },
    });

    if (!exercise) throw new NotFoundException('Ejercicio no encontrado');
    if (exercise.type !== ExerciseType.QUIZ) {
      throw new BadRequestException('Este ejercicio no es un quiz');
    }

    const locked = await this.premiumAccessService.isLessonLocked({
      courseId: exercise.lesson.courseId,
      lessonOrder: exercise.lesson.order,
      freeLimit: exercise.lesson.course.freeLimit,
      userId,
      role,
    });
    if (locked) {
      throw new ForbiddenException(
        'Este ejercicio requiere una suscripción Premium',
      );
    }

    const lang = dto.lang || 'es';
    const translation =
      exercise.translations.find((t) => t.language.code === lang) ||
      exercise.translations.find((t) => t.language.code === 'es') ||
      exercise.translations[0];

    const rawContent = translation?.content || exercise.content || {};
    const quizBlocks = this.extractQuizBlocks(rawContent);
    const question = quizBlocks[dto.questionIndex];

    if (!question) {
      throw new NotFoundException('Pregunta no encontrada');
    }

    const correctOptions: number[] = Array.isArray(question.correct)
      ? question.correct
      : [];
    const submitted = [...new Set(dto.selectedOptions)].sort((a, b) => a - b);
    const expected = [...correctOptions].sort((a, b) => a - b);
    const isCorrect =
      submitted.length === expected.length &&
      submitted.every((value, index) => value === expected[index]);

    const quizScore = isCorrect ? 100 : 0;
    await this.prisma.exerciseAttempt.create({
      data: {
        userId,
        exerciseId: exercise.id,
        correct: isCorrect,
        score: quizScore,
        timeSpentSeconds: dto.timeSpentSeconds ?? null,
      },
    });

    let completion: {
      xpAdded: number;
      coinsAdded: number;
      alreadyCompleted?: boolean;
    } | null = null;

    if (isCorrect) {
      const attempts = await this.prisma.exerciseAttempt.count({
        where: { userId, exerciseId: exercise.id },
      });
      completion = await this.progressService.createProgress(
        userId,
        {
          lessonId: exercise.lessonId,
          exerciseId: exercise.id,
          attempts,
          score: quizScore,
          timeSpentSeconds: dto.timeSpentSeconds,
        },
        role,
      );
    }

    return {
      correct: isCorrect,
      correctOptions,
      explanation: question.explanation || '',
      completed: isCorrect,
      xpAdded: completion?.xpAdded ?? 0,
      coinsAdded: completion?.coinsAdded ?? 0,
    };
  }

  // NF26: corrección automática real para ejercicios CODE con tests
  // configurados — antes cualquier ejercicio de código se marcaba
  // "completado" por confianza pura del cliente (POST /progress con el
  // exerciseId, sin verificar nada). Si el ejercicio no tiene `tests`
  // definidos en codes[0], se sigue aceptando por presencia de código no
  // vacío para no romper contenido ya cargado sin tests.
  //
  // Aviso de seguridad: el código del estudiante corre en un
  // vm.createContext() vacío (sin require/process/fs/red) con timeout de
  // 2s por test — bloquea los ataques más triviales, pero node:vm NO es un
  // límite de seguridad endurecido contra un escape deliberado y
  // sofisticado. Aislar de verdad (NF27) requiere ejecución en contenedor/
  // proceso separado — hasta entonces, no exponer este endpoint sin rate
  // limiting y sin asumir que es seguro contra tráfico adversarial masivo.
  async submitCodeAnswer(
    userId: string,
    exerciseId: string,
    dto: SubmitCodeAnswerDto,
    role?: Role,
  ) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        lesson: {
          select: {
            order: true,
            courseId: true,
            course: { select: { freeLimit: true } },
          },
        },
      },
    });

    if (!exercise) throw new NotFoundException('Ejercicio no encontrado');
    if (exercise.type !== ExerciseType.CODE) {
      throw new BadRequestException('Este ejercicio no es de código');
    }

    const locked = await this.premiumAccessService.isLessonLocked({
      courseId: exercise.lesson.courseId,
      lessonOrder: exercise.lesson.order,
      freeLimit: exercise.lesson.course.freeLimit,
      userId,
      role,
    });
    if (locked) {
      throw new ForbiddenException(
        'Este ejercicio requiere una suscripción Premium',
      );
    }

    const codeEntry = (exercise.codes as any)?.[0] as
      | { tests?: Array<{ description: string; assertCode: string }>; expectedCode?: string }
      | undefined;

    let results: Array<{ description: string; passed: boolean; error?: string }>;

    if (codeEntry?.tests?.length) {
      // Formato nuevo: varias aserciones nombradas (NF26).
      results = this.runCodeTests(dto.code, codeEntry.tests);
    } else if (codeEntry?.expectedCode?.trim()) {
      // Formato ya usado por el contenido existente: expectedCode es un
      // bloque de `assert(condicion, mensaje)` que hoy corre sin verificar
      // nada server-side (el iframe del cliente lo ejecuta y el propio
      // cliente decide si avisa "passed: true"). Correrlo acá también,
      // server-side, es lo que cierra ese bypass de verdad.
      results = this.runCodeAssertionBlock(dto.code, codeEntry.expectedCode);
    } else {
      results = [{ description: 'Código enviado', passed: dto.code.trim().length > 0 }];
    }

    const isCorrect = results.every((result) => result.passed);
    const passedCount = results.filter((result) => result.passed).length;
    const codeScore = results.length
      ? Math.round((passedCount / results.length) * 100)
      : 0;

    await this.prisma.exerciseAttempt.create({
      data: {
        userId,
        exerciseId: exercise.id,
        correct: isCorrect,
        score: codeScore,
        timeSpentSeconds: dto.timeSpentSeconds ?? null,
      },
    });

    let completion: {
      xpAdded: number;
      coinsAdded: number;
      alreadyCompleted?: boolean;
    } | null = null;

    if (isCorrect) {
      const attempts = await this.prisma.exerciseAttempt.count({
        where: { userId, exerciseId: exercise.id },
      });
      completion = await this.progressService.createProgress(
        userId,
        {
          lessonId: exercise.lessonId,
          exerciseId: exercise.id,
          attempts,
          score: codeScore,
          timeSpentSeconds: dto.timeSpentSeconds,
        },
        role,
      );
    }

    return {
      correct: isCorrect,
      results,
      completed: isCorrect,
      xpAdded: completion?.xpAdded ?? 0,
      coinsAdded: completion?.coinsAdded ?? 0,
    };
  }

  // Mismo contrato que el bloque de assert() que ya arma el frontend dentro
  // del iframe (ver learn/exercise/code/[id]/page.tsx): expectedCode es
  // código que llama assert(condición, mensaje) una o más veces; si algo
  // no cumple, tira y la corrida se marca como incorrecta.
  private runCodeAssertionBlock(
    studentCode: string,
    expectedCode: string,
  ): Array<{ description: string; passed: boolean; error?: string }> {
    try {
      const context = vm.createContext({ console: { log() {}, error() {}, warn() {} } });
      const script = new vm.Script(`
        function assert(condition, message) {
          if (!condition) throw new Error(message || 'Assertion failed');
        }
        ${studentCode}
        ${expectedCode}
      `);
      script.runInContext(context, { timeout: 2000 });
      return [{ description: 'Assertions', passed: true }];
    } catch (error) {
      return [{ description: 'Assertions', passed: false, error: this.describeSandboxError(error) }];
    }
  }

  // Los errores que tira código corrido dentro de un vm.createContext()
  // pertenecen al Error de ESE realm, no al Error del proceso de Node —
  // `error instanceof Error` da false aunque tenga `.message` perfectamente
  // legible. Leer `.message` directo evita perder el mensaje del assert().
  private describeSandboxError(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.length > 0) return message;
    }
    return 'Error de ejecución';
  }

  private runCodeTests(
    studentCode: string,
    tests: Array<{ description: string; assertCode: string }>,
  ): Array<{ description: string; passed: boolean; error?: string }> {
    return tests.map((test) => {
      try {
        // Contexto nuevo por test: nada de estado compartido entre
        // corridas, y vm.createContext({}) no expone ningún global de
        // Node (require/process/Buffer/global) al código ejecutado.
        const context = vm.createContext({ console: { log() {}, error() {}, warn() {} } });
        const script = new vm.Script(`${studentCode}\n;(${test.assertCode})`);
        const result = script.runInContext(context, { timeout: 2000 });
        return { description: test.description, passed: Boolean(result) };
      } catch (error) {
        return { description: test.description, passed: false, error: this.describeSandboxError(error) };
      }
    });
  }

  // Update y delete (sin cambios)
  async updateExercise(id: string, dto: UpdateExerciseDto) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!exercise) {
      throw new NotFoundException('Ejercicio no encontrado');
    }

    await this.prisma.exercise.update({
      where: { id },
      data: {
        experience: dto.experience,
        coins: dto.coins,
        order: dto.order,
        status: dto.status,
        codes: dto.codes as unknown as Prisma.InputJsonValue | undefined,
      },
    });

    if (dto.translations) {
      for (const t of dto.translations) {
        const language = await this.prisma.language.findUnique({
          where: { code: t.languageCode },
        });

        if (!language) continue;

        const existing = exercise.translations.find(
          (tr) => tr.languageId === language.id,
        );

        const content = t.content as Prisma.InputJsonValue | undefined;

        if (existing) {
          await this.prisma.exerciseTranslation.update({
            where: { id: existing.id },
            data: {
              title: t.title,
              description: t.description,
              content,
            },
          });
        } else {
          await this.prisma.exerciseTranslation.create({
            data: {
              exerciseId: id,
              languageId: language.id,
              title: t.title,
              description: t.description,
              content,
            },
          });
        }
      }
    }

    return { success: true };
  }

  async deleteExercise(id: string) {
    await this.prisma.exerciseTranslation.deleteMany({
      where: { exerciseId: id },
    });

    return this.prisma.exercise.delete({
      where: { id },
    });
  }

  async reorderExercises(dto: ReorderDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.exercise.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );
    return { success: true };
  }

  async getAdminExercises(lang: string = 'es') {
    const exercises: AdminExercisePayload[] =
      await this.prisma.exercise.findMany({
        orderBy: { order: 'asc' },
        include: {
          translations: { include: { language: true } },

          lesson: {
            include: {
              translations: { include: { language: true } },

              course: {
                include: {
                  translations: { include: { language: true } },
                },
              },
            },
          },
        },
      });

    return exercises.map((ex) => {
      const translation =
        ex.translations.find((t) => t.language.code === lang) ||
        ex.translations.find((t) => t.language.code === 'es') ||
        ex.translations[0];

      const lessonTranslation =
        ex.lesson.translations.find((t) => t.language.code === lang) ||
        ex.lesson.translations.find((t) => t.language.code === 'es') ||
        ex.lesson.translations[0];

      const courseTranslation =
        ex.lesson.course.translations.find((t) => t.language.code === lang) ||
        ex.lesson.course.translations.find((t) => t.language.code === 'es') ||
        ex.lesson.course.translations[0];

      return {
        id: ex.id,
        title: translation?.title ?? 'Sin título',
        type: ex.type,
        experience: ex.experience,

        lessonTitle: lessonTranslation?.title ?? '-',
        courseTitle: courseTranslation?.title ?? '-',
      };
    });
  }
}
