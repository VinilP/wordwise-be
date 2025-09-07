import { PrismaClient, User, UserFavorite } from '@prisma/client';

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByIdWithCounts(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            reviews: true,
            favorites: true,
          },
        },
      },
    });
  }

  async findByIdWithDetails(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        reviews: {
          include: {
            book: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        favorites: {
          include: {
            book: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            reviews: true,
            favorites: true,
          },
        },
      },
    });
  }

  async findFavorite(userId: string, bookId: string) {
    return this.prisma.userFavorite.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
    });
  }

  async createFavorite(userId: string, bookId: string) {
    return this.prisma.userFavorite.create({
      data: {
        userId,
        bookId,
      },
    });
  }

  async deleteFavorite(userId: string, bookId: string) {
    return this.prisma.userFavorite.delete({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
    });
  }

  async findUserFavorites(userId: string) {
    return this.prisma.userFavorite.findMany({
      where: { userId },
      include: {
        book: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}