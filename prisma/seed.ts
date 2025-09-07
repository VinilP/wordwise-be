import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const seedBooks = [
  {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    description: "A classic American novel set in the Jazz Age, exploring themes of wealth, love, and the American Dream through the eyes of narrator Nick Carraway and his mysterious neighbor Jay Gatsby.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg",
    genres: ["Fiction", "Classic", "American Literature"],
    publishedYear: 1925,
  },
  {
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    description: "A gripping tale of racial injustice and childhood innocence in the American South, told through the eyes of Scout Finch as her father defends a black man falsely accused of rape.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780061120084-L.jpg",
    genres: ["Fiction", "Classic", "Drama"],
    publishedYear: 1960,
  },
  {
    title: "1984",
    author: "George Orwell",
    description: "A dystopian social science fiction novel about totalitarian control, surveillance, and the struggle for individual freedom in a world where Big Brother is always watching.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg",
    genres: ["Fiction", "Dystopian", "Science Fiction"],
    publishedYear: 1949,
  },
  {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    description: "A romantic novel that critiques the British landed gentry at the end of the 18th century, following the emotional development of Elizabeth Bennet and her relationship with Mr. Darcy.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg",
    genres: ["Fiction", "Romance", "Classic"],
    publishedYear: 1813,
  },
  {
    title: "The Catcher in the Rye",
    author: "J.D. Salinger",
    description: "A controversial coming-of-age story following teenager Holden Caulfield as he navigates the complexities of adolescence and society in 1950s New York City.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780316769174-L.jpg",
    genres: ["Fiction", "Coming of Age", "Classic"],
    publishedYear: 1951,
  },
  {
    title: "The Lord of the Rings: The Fellowship of the Ring",
    author: "J.R.R. Tolkien",
    description: "The first volume of the epic fantasy trilogy following hobbit Frodo Baggins as he embarks on a quest to destroy the One Ring and save Middle-earth from the Dark Lord Sauron.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780547928210-L.jpg",
    genres: ["Fantasy", "Adventure", "Epic"],
    publishedYear: 1954,
  },
  {
    title: "Harry Potter and the Philosopher's Stone",
    author: "J.K. Rowling",
    description: "The first book in the beloved series about a young wizard who discovers his magical heritage and attends Hogwarts School of Witchcraft and Wizardry.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780747532699-L.jpg",
    genres: ["Fantasy", "Young Adult", "Adventure"],
    publishedYear: 1997,
  },
  {
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    description: "A fantasy adventure following Bilbo Baggins, a hobbit who joins a group of dwarves on a quest to reclaim their homeland from the dragon Smaug.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg",
    genres: ["Fantasy", "Adventure", "Children's"],
    publishedYear: 1937,
  },
  {
    title: "Dune",
    author: "Frank Herbert",
    description: "A science fiction epic set on the desert planet Arrakis, following Paul Atreides as he navigates political intrigue, ecological themes, and mystical powers.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg",
    genres: ["Science Fiction", "Epic", "Adventure"],
    publishedYear: 1965,
  },
  {
    title: "The Hitchhiker's Guide to the Galaxy",
    author: "Douglas Adams",
    description: "A comedic science fiction series following Arthur Dent as he travels through space after Earth is destroyed to make way for a hyperspace bypass.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780345391803-L.jpg",
    genres: ["Science Fiction", "Comedy", "Adventure"],
    publishedYear: 1979,
  },
  {
    title: "Brave New World",
    author: "Aldous Huxley",
    description: "A dystopian novel exploring a future society where humans are genetically engineered and conditioned for specific social roles, questioning the nature of happiness and freedom.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780060850524-L.jpg",
    genres: ["Fiction", "Dystopian", "Science Fiction"],
    publishedYear: 1932,
  },
  {
    title: "The Chronicles of Narnia: The Lion, the Witch and the Wardrobe",
    author: "C.S. Lewis",
    description: "A fantasy novel about four children who discover a magical world through a wardrobe, where they must help the lion Aslan defeat the White Witch.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780064404990-L.jpg",
    genres: ["Fantasy", "Children's", "Adventure"],
    publishedYear: 1950,
  },
  // Additional books to reach 24 total
  {
    title: "The Handmaid's Tale",
    author: "Margaret Atwood",
    description: "A dystopian novel set in the Republic of Gilead, where women are subjugated and used for reproduction, following Offred's struggle for survival and freedom.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780385490818-L.jpg",
    genres: ["Fiction", "Dystopian", "Feminist"],
    publishedYear: 1985,
  },
  {
    title: "The Kite Runner",
    author: "Khaled Hosseini",
    description: "A powerful story of friendship, betrayal, and redemption set against the backdrop of Afghanistan's tumultuous history, following Amir and Hassan's complex relationship.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9781594631931-L.jpg",
    genres: ["Fiction", "Drama", "Historical"],
    publishedYear: 2003,
  },
  {
    title: "The Alchemist",
    author: "Paulo Coelho",
    description: "A philosophical novel following Santiago, a young Andalusian shepherd, as he travels from Spain to Egypt in search of a treasure and discovers the true meaning of life.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780061120084-L.jpg",
    genres: ["Fiction", "Philosophy", "Adventure"],
    publishedYear: 1988,
  },
  {
    title: "The Book Thief",
    author: "Markus Zusak",
    description: "A moving story set in Nazi Germany, told from Death's perspective, following Liesel Meminger as she steals books and shares them with others during World War II.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780375831003-L.jpg",
    genres: ["Fiction", "Historical", "Young Adult"],
    publishedYear: 2005,
  },
  {
    title: "The Giver",
    author: "Lois Lowry",
    description: "A dystopian novel about a society that has eliminated pain and suffering by converting to 'Sameness', following Jonas as he discovers the dark truth behind his perfect world.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780544336261-L.jpg",
    genres: ["Fiction", "Dystopian", "Young Adult"],
    publishedYear: 1993,
  },
  {
    title: "The Fault in Our Stars",
    author: "John Green",
    description: "A heart-wrenching love story between two teenagers who meet in a cancer support group, exploring themes of love, loss, and the meaning of life.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780525478812-L.jpg",
    genres: ["Fiction", "Romance", "Young Adult"],
    publishedYear: 2012,
  },
  {
    title: "The Hunger Games",
    author: "Suzanne Collins",
    description: "A dystopian novel set in Panem, where teenagers are forced to participate in a televised fight to the death, following Katniss Everdeen's struggle for survival.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780439023481-L.jpg",
    genres: ["Fiction", "Dystopian", "Young Adult"],
    publishedYear: 2008,
  },
  {
    title: "The Martian",
    author: "Andy Weir",
    description: "A science fiction novel about astronaut Mark Watney, who is stranded on Mars and must use his ingenuity and determination to survive until rescue.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780553418026-L.jpg",
    genres: ["Science Fiction", "Adventure", "Survival"],
    publishedYear: 2011,
  },
  {
    title: "The Girl with the Dragon Tattoo",
    author: "Stieg Larsson",
    description: "A crime thriller following journalist Mikael Blomkvist and hacker Lisbeth Salander as they investigate a decades-old disappearance and uncover dark family secrets.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780307269751-L.jpg",
    genres: ["Fiction", "Thriller", "Crime"],
    publishedYear: 2005,
  },
  {
    title: "The Help",
    author: "Kathryn Stockett",
    description: "A novel set in 1960s Mississippi, following the lives of African American maids and a young white woman who writes about their experiences during the civil rights movement.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780399155345-L.jpg",
    genres: ["Fiction", "Historical", "Drama"],
    publishedYear: 2009,
  },
  {
    title: "The Road",
    author: "Cormac McCarthy",
    description: "A post-apocalyptic novel following a father and son as they journey through a devastated landscape, struggling to survive and maintain their humanity.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780307265432-L.jpg",
    genres: ["Fiction", "Post-Apocalyptic", "Drama"],
    publishedYear: 2006,
  },
  {
    title: "The Time Traveler's Wife",
    author: "Audrey Niffenegger",
    description: "A romantic novel about Henry, a man with a genetic disorder that causes him to time travel unpredictably, and his wife Clare, who must navigate their unconventional relationship.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780156029438-L.jpg",
    genres: ["Fiction", "Romance", "Science Fiction"],
    publishedYear: 2003,
  },
  {
    title: "The Lovely Bones",
    author: "Alice Sebold",
    description: "A novel told from the perspective of Susie Salmon, a 14-year-old girl who was murdered and watches from heaven as her family and friends cope with her death.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780316166683-L.jpg",
    genres: ["Fiction", "Drama", "Mystery"],
    publishedYear: 2002,
  },
  {
    title: "The Secret Life of Bees",
    author: "Sue Monk Kidd",
    description: "A coming-of-age novel set in 1964 South Carolina, following 14-year-old Lily Owens as she runs away from home and finds refuge with three beekeeping sisters.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780142001745-L.jpg",
    genres: ["Fiction", "Coming of Age", "Historical"],
    publishedYear: 2002,
  }
];

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data (in development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('Clearing existing data...');
      await prisma.userFavorite.deleteMany();
      await prisma.review.deleteMany();
      await prisma.book.deleteMany();
      await prisma.user.deleteMany();
    }

    // Create users
    console.log('👥 Creating users...');
    const users = await Promise.all([
      prisma.user.create({
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          password: await bcrypt.hash('password123', 10),
        },
      }),
      prisma.user.create({
        data: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          password: await bcrypt.hash('password123', 10),
        },
      }),
      prisma.user.create({
        data: {
          name: 'Bob Johnson',
          email: 'bob@example.com',
          password: await bcrypt.hash('password123', 10),
        },
      }),
    ]);

    // Seed books
    console.log('📚 Creating books...');
    const books = [];
    for (const bookData of seedBooks) {
      const book = await prisma.book.create({
        data: bookData,
      });
      books.push(book);
      console.log(`Created book: ${book.title}`);
    }

    // Create reviews
    console.log('⭐ Creating reviews...');
    const reviews = await Promise.all([
      prisma.review.create({
        data: {
          userId: users[0].id,
          bookId: books[0].id, // The Great Gatsby
          rating: 5,
          content: 'Absolutely loved this book! The writing is beautiful.',
        },
      }),
      prisma.review.create({
        data: {
          userId: users[1].id,
          bookId: books[0].id, // The Great Gatsby
          rating: 4,
          content: 'Great classic, though a bit slow at times.',
        },
      }),
      prisma.review.create({
        data: {
          userId: users[2].id,
          bookId: books[0].id, // The Great Gatsby
          rating: 3,
          content: 'Not my cup of tea, but well written.',
        },
      }),
      prisma.review.create({
        data: {
          userId: users[0].id,
          bookId: books[1].id, // To Kill a Mockingbird
          rating: 5,
          content: 'Powerful and moving. A must-read.',
        },
      }),
      prisma.review.create({
        data: {
          userId: users[1].id,
          bookId: books[1].id, // To Kill a Mockingbird
          rating: 4,
          content: 'Excellent book with important themes.',
        },
      }),
      prisma.review.create({
        data: {
          userId: users[0].id,
          bookId: books[2].id, // 1984
          rating: 5,
          content: 'Chilling and prophetic. Still relevant today.',
        },
      }),
      prisma.review.create({
        data: {
          userId: users[1].id,
          bookId: books[2].id, // 1984
          rating: 5,
          content: 'One of the best books I\'ve ever read.',
        },
      }),
      prisma.review.create({
        data: {
          userId: users[2].id,
          bookId: books[2].id, // 1984
          rating: 4,
          content: 'Thought-provoking and well-written.',
        },
      }),
      prisma.review.create({
        data: {
          userId: users[0].id,
          bookId: books[3].id, // Pride and Prejudice
          rating: 4,
          content: 'Charming and witty. Jane Austen at her best.',
        },
      }),
      prisma.review.create({
        data: {
          userId: users[1].id,
          bookId: books[3].id, // Pride and Prejudice
          rating: 5,
          content: 'A delightful romantic comedy.',
        },
      }),
      prisma.review.create({
        data: {
          userId: users[0].id,
          bookId: books[4].id, // The Catcher in the Rye
          rating: 4,
          content: 'Interesting perspective on teenage life.',
        },
      }),
      prisma.review.create({
        data: {
          userId: users[1].id,
          bookId: books[4].id, // The Catcher in the Rye
          rating: 3,
          content: 'A bit too angsty for my taste, but well written.',
        },
      }),
    ]);

    // Create favorites
    console.log('❤️ Creating favorites...');
    const favorites = await Promise.all([
      prisma.userFavorite.create({
        data: {
          userId: users[0].id,
          bookId: books[0].id, // The Great Gatsby
        },
      }),
      prisma.userFavorite.create({
        data: {
          userId: users[0].id,
          bookId: books[2].id, // 1984
        },
      }),
      prisma.userFavorite.create({
        data: {
          userId: users[1].id,
          bookId: books[1].id, // To Kill a Mockingbird
        },
      }),
      prisma.userFavorite.create({
        data: {
          userId: users[1].id,
          bookId: books[3].id, // Pride and Prejudice
        },
      }),
      prisma.userFavorite.create({
        data: {
          userId: users[2].id,
          bookId: books[2].id, // 1984
        },
      }),
    ]);

    // Update book statistics (averageRating and reviewCount)
    console.log('📊 Updating book statistics...');
    for (const book of books) {
      const bookReviews = await prisma.review.findMany({
        where: { bookId: book.id },
        select: { rating: true },
      });

      if (bookReviews.length > 0) {
        const averageRating = bookReviews.reduce((sum, review) => sum + review.rating, 0) / bookReviews.length;
        const reviewCount = bookReviews.length;

        await prisma.book.update({
          where: { id: book.id },
          data: {
            averageRating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
            reviewCount: reviewCount,
          },
        });

        console.log(`Updated ${book.title}: ${averageRating.toFixed(2)} avg rating, ${reviewCount} reviews`);
      }
    }

    console.log('✅ Database seeded successfully!');
    console.log(`👥 Created ${users.length} users`);
    console.log(`📚 Created ${books.length} books`);
    console.log(`⭐ Created ${reviews.length} reviews`);
    console.log(`❤️ Created ${favorites.length} favorites`);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });