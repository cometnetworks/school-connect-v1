import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * School Connect — multi-tenant schema
 *
 * Cada escuela es un tenant aislado por `schoolId`. Toda tabla con datos
 * sensibles tiene `schoolId` y un índice para filtrar.
 *
 * Roles: owner > admin > director > teacher > parent
 */
export default defineSchema({
  schools: defineTable({
    name: v.string(),
    slug: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsappNumber: v.optional(v.string()),
    website: v.optional(v.string()),
    locale: v.string(),
    timezone: v.string(),
    logoStorageId: v.optional(v.id("_storage")),
    plan: v.union(
      v.literal("beta"),
      v.literal("starter"),
      v.literal("growth"),
      v.literal("pro"),
    ),
    studentCapacity: v.number(),
    isActive: v.boolean(),
    onboardingStatus: v.union(
      v.literal("pending"),
      v.literal("info_loaded"),
      v.literal("whatsapp_connected"),
      v.literal("live"),
    ),
    admissionsInfo: v.optional(
      v.object({
        tuitionRanges: v.optional(v.string()),
        educationModel: v.optional(v.string()),
        schedule: v.optional(v.string()),
        gradesOffered: v.optional(v.string()),
        requirements: v.optional(v.string()),
        differentiators: v.optional(v.string()),
        visitInstructions: v.optional(v.string()),
        faqs: v.optional(v.string()),
      }),
    ),
    calComEventTypeId: v.optional(v.string()),
    whatsappPhoneNumberId: v.optional(v.string()),
    directorPhone: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_whatsapp_phone", ["whatsappPhoneNumberId"]),

  users: defineTable({
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    fullName: v.string(),
    avatarStorageId: v.optional(v.id("_storage")),
  })
    .index("by_email", ["email"])
    .index("by_phone", ["phone"]),

  userRoles: defineTable({
    userId: v.id("users"),
    schoolId: v.id("schools"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("director"),
      v.literal("teacher"),
      v.literal("parent"),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_school", ["schoolId"])
    .index("by_user_school", ["userId", "schoolId"]),

  students: defineTable({
    schoolId: v.id("schools"),
    fullName: v.string(),
    birthDate: v.optional(v.string()),
    gradeLevel: v.string(),
    isActive: v.boolean(),
  }).index("by_school", ["schoolId"]),

  parentStudentLinks: defineTable({
    studentId: v.id("students"),
    parentUserId: v.id("users"),
    relation: v.string(),
    canPickup: v.boolean(),
  })
    .index("by_student", ["studentId"])
    .index("by_parent", ["parentUserId"]),

  groups: defineTable({
    schoolId: v.id("schools"),
    name: v.string(),
    gradeLevel: v.string(),
    cycleYear: v.string(),
  }).index("by_school", ["schoolId"]),

  groupTeachers: defineTable({
    groupId: v.id("groups"),
    teacherUserId: v.id("users"),
    subject: v.optional(v.string()),
    isHomeroom: v.boolean(),
  })
    .index("by_group", ["groupId"])
    .index("by_teacher", ["teacherUserId"]),

  studentGroups: defineTable({
    studentId: v.id("students"),
    groupId: v.id("groups"),
  })
    .index("by_student", ["studentId"])
    .index("by_group", ["groupId"]),

  // ─── Fase 1: Admisiones ───────────────────────────────────────────
  conversations: defineTable({
    schoolId: v.id("schools"),
    channel: v.union(v.literal("whatsapp"), v.literal("webchat")),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    interestStudentName: v.optional(v.string()),
    interestGradeLevel: v.optional(v.string()),
    status: v.union(
      v.literal("new"),
      v.literal("qualified"),
      v.literal("visit_scheduled"),
      v.literal("visited"),
      v.literal("enrolled"),
      v.literal("lost"),
    ),
    lostReason: v.optional(v.string()),
    lastMessageAt: v.number(),
    assignedHumanId: v.optional(v.id("users")),
    kapsoConversationId: v.optional(v.string()),
    pendingSlots: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("admission"),
      v.literal("parent"),
      v.literal("director"),
    )),
  })
    .index("by_school", ["schoolId"])
    .index("by_school_status", ["schoolId", "status"])
    .index("by_phone", ["contactPhone"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    sender: v.union(
      v.literal("contact"),
      v.literal("agent"),
      v.literal("human"),
    ),
    body: v.string(),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaType: v.optional(v.string()),
    kapsoMessageId: v.optional(v.string()),
  }).index("by_conversation", ["conversationId"]),

  visits: defineTable({
    schoolId: v.id("schools"),
    conversationId: v.optional(v.id("conversations")),
    contactName: v.string(),
    contactPhone: v.string(),
    studentName: v.optional(v.string()),
    gradeLevel: v.optional(v.string()),
    scheduledAt: v.number(),
    durationMinutes: v.number(),
    calBookingId: v.optional(v.string()),
    status: v.union(
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("attended"),
      v.literal("noshow"),
      v.literal("cancelled"),
    ),
    notes: v.optional(v.string()),
  })
    .index("by_school", ["schoolId"])
    .index("by_school_date", ["schoolId", "scheduledAt"]),

  // ─── Fase 2: Portal de padres ────────────────────────────────────
  announcements: defineTable({
    schoolId: v.id("schools"),
    groupId: v.optional(v.id("groups")),
    authorUserId: v.optional(v.id("users")),
    title: v.string(),
    body: v.string(),
    publishedAt: v.number(),
    sendViaWhatsapp: v.boolean(),
  })
    .index("by_school", ["schoolId"])
    .index("by_group", ["groupId"]),

  assignments: defineTable({
    groupId: v.id("groups"),
    teacherUserId: v.id("users"),
    subject: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.number(),
    createdAt: v.number(),
  })
    .index("by_group", ["groupId"])
    .index("by_group_due", ["groupId", "dueDate"]),

  grades: defineTable({
    studentId: v.id("students"),
    subject: v.string(),
    teacherUserId: v.id("users"),
    period: v.string(),
    score: v.number(),
    weight: v.optional(v.number()),
    note: v.optional(v.string()),
    capturedAt: v.number(),
  })
    .index("by_student", ["studentId"])
    .index("by_student_period", ["studentId", "period"]),

  events: defineTable({
    schoolId: v.id("schools"),
    title: v.string(),
    description: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.optional(v.number()),
    audience: v.union(
      v.literal("all"),
      v.literal("group"),
      v.literal("grade"),
    ),
    groupId: v.optional(v.id("groups")),
    gradeLevel: v.optional(v.string()),
  })
    .index("by_school", ["schoolId"])
    .index("by_school_starts", ["schoolId", "startsAt"]),

  tuitionInvoices: defineTable({
    studentId: v.id("students"),
    schoolId: v.id("schools"),
    period: v.string(),
    amount: v.number(),
    currency: v.string(),
    dueDate: v.number(),
    paidAt: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("overdue"),
    ),
  })
    .index("by_student", ["studentId"])
    .index("by_school", ["schoolId"]),

  // ─── Beta program ────────────────────────────────────────────────
  betaApplications: defineTable({
    schoolName: v.string(),
    contactName: v.string(),
    contactRole: v.optional(v.string()),
    email: v.string(),
    phone: v.string(),
    studentCount: v.optional(v.number()),
    city: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("accepted"),
      v.literal("rejected"),
    ),
  }).index("by_status", ["status"]),
});
