import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Production-safe seed - only seeds if database is empty
async function main() {
  console.log("🌱 Checking if database needs seeding...");

  // Check if users already exist
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log("✅ Database already has data, skipping seed.");
    return;
  }

  console.log("🌱 Seeding database with demo data...");

  const password = await bcrypt.hash("demo123", 12);

  // Create demo users
  const alice = await prisma.user.create({
    data: { email: "alice@demo.com", name: "Alice Johnson", password },
  });

  const bob = await prisma.user.create({
    data: { email: "bob@demo.com", name: "Bob Smith", password },
  });

  const charlie = await prisma.user.create({
    data: { email: "charlie@demo.com", name: "Charlie Brown", password },
  });

  // Create a board owned by Alice
  const board = await prisma.board.create({
    data: {
      title: "Product Launch Q1",
      ownerId: alice.id,
      members: {
        createMany: {
          data: [
            { userId: alice.id, role: "OWNER" },
            { userId: bob.id, role: "ADMIN" },
            { userId: charlie.id, role: "MEMBER" },
          ],
        },
      },
    },
  });

  // Create lists
  const backlog = await prisma.list.create({
    data: { title: "Backlog", position: 0, boardId: board.id },
  });

  const inProgress = await prisma.list.create({
    data: { title: "In Progress", position: 1, boardId: board.id },
  });

  const review = await prisma.list.create({
    data: { title: "Review", position: 2, boardId: board.id },
  });

  const done = await prisma.list.create({
    data: { title: "Done", position: 3, boardId: board.id },
  });

  // Create tasks in Backlog
  const task1 = await prisma.task.create({
    data: {
      title: "Design landing page mockups",
      description: "Create high-fidelity mockups for the new landing page using Figma",
      position: 0,
      priority: "HIGH",
      listId: backlog.id,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: "Set up CI/CD pipeline",
      description: "Configure GitHub Actions for automated testing and deployment",
      position: 1,
      priority: "MEDIUM",
      listId: backlog.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Write API documentation",
      description: "Document all REST endpoints using OpenAPI spec",
      position: 2,
      priority: "LOW",
      listId: backlog.id,
    },
  });

  // Create tasks in In Progress
  const task4 = await prisma.task.create({
    data: {
      title: "Implement user authentication",
      description: "Build signup/login flow with JWT tokens",
      position: 0,
      priority: "URGENT",
      listId: inProgress.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Build dashboard UI",
      description: "Create the main dashboard with board cards and navigation",
      position: 1,
      priority: "HIGH",
      listId: inProgress.id,
    },
  });

  // Create tasks in Review
  await prisma.task.create({
    data: {
      title: "Database schema design",
      description: "Finalize PostgreSQL schema with proper indexes and relations",
      position: 0,
      priority: "MEDIUM",
      listId: review.id,
    },
  });

  // Create tasks in Done
  await prisma.task.create({
    data: {
      title: "Project setup and scaffolding",
      description: "Initialize monorepo with React frontend and Express backend",
      position: 0,
      priority: "HIGH",
      listId: done.id,
    },
  });

  // Assign users to tasks
  await prisma.taskAssignee.createMany({
    data: [
      { taskId: task1.id, userId: alice.id },
      { taskId: task1.id, userId: bob.id },
      { taskId: task2.id, userId: charlie.id },
      { taskId: task4.id, userId: alice.id },
    ],
  });

  // Create some activity history
  await prisma.activity.createMany({
    data: [
      {
        type: "BOARD_CREATED",
        message: 'Alice Johnson created board "Product Launch Q1"',
        boardId: board.id,
        userId: alice.id,
      },
      {
        type: "MEMBER_ADDED",
        message: "Alice Johnson added Bob Smith to the board",
        boardId: board.id,
        userId: alice.id,
      },
      {
        type: "MEMBER_ADDED",
        message: "Alice Johnson added Charlie Brown to the board",
        boardId: board.id,
        userId: alice.id,
      },
      {
        type: "TASK_CREATED",
        message: 'Alice Johnson created task "Design landing page mockups"',
        boardId: board.id,
        taskId: task1.id,
        userId: alice.id,
      },
      {
        type: "TASK_ASSIGNED",
        message: 'Bob Smith was assigned to "Design landing page mockups"',
        boardId: board.id,
        taskId: task1.id,
        userId: alice.id,
      },
    ],
  });

  // Create a second board
  await prisma.board.create({
    data: {
      title: "Bug Tracker",
      ownerId: bob.id,
      members: {
        createMany: {
          data: [
            { userId: bob.id, role: "OWNER" },
            { userId: alice.id, role: "MEMBER" },
          ],
        },
      },
    },
  });

  console.log("✅ Seed complete!");
  console.log("\n📋 Demo credentials:");
  console.log("  alice@demo.com / demo123");
  console.log("  bob@demo.com / demo123");
  console.log("  charlie@demo.com / demo123");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
