-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."books" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "description" TEXT,
    "cover_image_url" TEXT,
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published_year" INTEGER,
    "average_rating" DECIMAL(3,2) DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reviews" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT,
    "rating" SMALLINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "books_title_idx" ON "public"."books"("title");

-- CreateIndex
CREATE INDEX "books_author_idx" ON "public"."books"("author");

-- CreateIndex
CREATE INDEX "books_genres_idx" ON "public"."books"("genres");

-- CreateIndex
CREATE INDEX "reviews_book_id_idx" ON "public"."reviews"("book_id");

-- CreateIndex
CREATE INDEX "reviews_user_id_idx" ON "public"."reviews"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_book_id_user_id_key" ON "public"."reviews"("book_id", "user_id");

-- CreateIndex
CREATE INDEX "user_favorites_user_id_idx" ON "public"."user_favorites"("user_id");

-- CreateIndex
CREATE INDEX "user_favorites_book_id_idx" ON "public"."user_favorites"("book_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorites_user_id_book_id_key" ON "public"."user_favorites"("user_id", "book_id");

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_favorites" ADD CONSTRAINT "user_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_favorites" ADD CONSTRAINT "user_favorites_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
