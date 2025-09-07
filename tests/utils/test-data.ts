import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function createTestUser(
  prisma: PrismaClient, 
  email: string = 'test@example.com',
  name: string = 'Test User'
) {
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  
  return await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });
}

export async function createTestBook(
  prisma: PrismaClient,
  title: string = 'Test Book',
  author: string = 'Test Author',
  description: string = 'Test Description',
  genres: string[] = ['Fiction', 'Drama'],
  publishedYear: number = 2023
) {
  return await prisma.book.create({
    data: {
      title,
      author,
      description,
      coverImageUrl: 'http://example.com/cover.jpg',
      genres,
      publishedYear,
      averageRating: null,
      reviewCount: 0,
    },
  });
}

export async function createTestReview(
  prisma: PrismaClient,
  userId: string,
  bookId: string,
  rating: number = 5,
  content: string = 'Great book!'
) {
  return await prisma.review.create({
    data: {
      userId,
      bookId,
      rating,
      content,
    },
  });
}

export async function createTestFavorite(
  prisma: PrismaClient,
  userId: string,
  bookId: string
) {
  return await prisma.userFavorite.create({
    data: {
      userId,
      bookId,
    },
  });
}

export async function createTestData(prisma: PrismaClient) {
  const user = await createTestUser(prisma);
  const book = await createTestBook(prisma);
  const review = await createTestReview(prisma, user.id, book.id);
  const favorite = await createTestFavorite(prisma, user.id, book.id);
  
  return {
    user,
    book,
    review,
    favorite,
  };
}

export async function createMultipleTestBooks(prisma: PrismaClient, count: number = 5) {
  const books = [];
  for (let i = 0; i < count; i++) {
    const book = await createTestBook(
      prisma,
      `Test Book ${i + 1}`,
      `Test Author ${i + 1}`,
      `Test Description ${i + 1}`,
      ['Fiction'],
      2020 + i
    );
    books.push(book);
  }
  return books;
}

export async function createMultipleTestUsers(prisma: PrismaClient, count: number = 3) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const user = await createTestUser(
      prisma,
      `test${i + 1}@example.com`,
      `Test User ${i + 1}`
    );
    users.push(user);
  }
  return users;
}

export async function createTestReviewsForBook(
  prisma: PrismaClient,
  bookId: string,
  userIds: string[],
  ratings: number[] = [5, 4, 3]
) {
  const reviews = [];
  for (let i = 0; i < userIds.length; i++) {
    const review = await createTestReview(
      prisma,
      userIds[i],
      bookId,
      ratings[i] || 5,
      `Review ${i + 1} for this book`
    );
    reviews.push(review);
  }
  return reviews;
}
