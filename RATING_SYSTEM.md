# Rating Aggregation System

## Overview

The rating aggregation system automatically calculates and maintains accurate average ratings for books based on user reviews. The system ensures that ratings are updated in real-time whenever reviews are created, updated, or deleted.

## Components

### 1. RatingService (`src/services/rating.service.ts`)

The core service responsible for rating calculations and updates.

**Key Methods:**
- `calculateBookRating(bookId)` - Calculates average rating and review count for a book
- `updateBookRating(bookId)` - Updates book rating in the database
- `recalculateAllRatings()` - Recalculates ratings for all books (background job)
- `getBookRatingStats(bookId)` - Returns detailed rating statistics including distribution
- `handleReviewOperation(bookId, operation)` - Handles rating updates after review operations

### 2. RatingRecalculationJob (`src/jobs/rating-recalculation.job.ts`)

Background job system for bulk rating recalculation.

**Features:**
- Processes all books in the system
- Error handling and reporting
- Performance metrics (duration, processed count)
- Scheduling support for periodic execution

### 3. RatingController (`src/controllers/rating.controller.ts`)

API endpoints for rating management and monitoring.

**Endpoints:**
- `GET /api/ratings/book/:bookId/stats` - Get rating statistics for a book
- `POST /api/ratings/recalculate` - Manually trigger rating recalculation (admin)
- `GET /api/ratings/books-without-reviews` - Get books with no reviews (admin)
- `PUT /api/ratings/book/:bookId/update` - Manually update book rating (admin)

## Automatic Rating Updates

The system automatically updates book ratings when:

1. **Review Creation**: New review is added → rating recalculated
2. **Review Update**: Existing review rating is changed → rating recalculated
3. **Review Deletion**: Review is removed → rating recalculated

### Integration Points

The rating system is integrated into the review service operations:

```typescript
// In ReviewService
await this.ratingService.handleReviewOperation(bookId, 'create');
await this.ratingService.handleReviewOperation(bookId, 'update');
await this.ratingService.handleReviewOperation(bookId, 'delete');
```

## Rating Calculation Logic

### Average Rating Calculation
- Sum of all review ratings divided by number of reviews
- Rounded to 1 decimal place for display
- Books with no reviews have rating = 0

### Example:
```
Reviews: [5, 4, 3, 4, 5]
Average: (5 + 4 + 3 + 4 + 5) / 5 = 4.2
```

### Rating Distribution
The system tracks how many reviews exist for each rating (1-5 stars):
```json
{
  "averageRating": 4.2,
  "reviewCount": 5,
  "ratingDistribution": {
    "1": 0,
    "2": 0,
    "3": 1,
    "4": 2,
    "5": 2
  }
}
```

## Database Schema

The rating system uses the following database fields:

```sql
-- books table
averageRating DECIMAL(3,2) DEFAULT 0  -- e.g., 4.25
reviewCount   INT DEFAULT 0           -- total number of reviews
```

## Error Handling

### Transaction Integrity
- Rating updates are part of review operations
- If rating update fails, the entire review operation is rolled back
- Ensures data consistency

### Background Job Error Handling
- Individual book failures don't stop the entire job
- Errors are collected and reported
- Partial success scenarios are handled gracefully

## Performance Considerations

### Caching
- Rating calculations are performed on-demand
- Results are stored in the database for fast retrieval
- No additional caching layer needed for basic operations

### Optimization
- Rating updates use efficient database aggregation queries
- Bulk operations are batched for better performance
- Database indexes on `bookId` and `rating` fields improve query speed

## Monitoring and Maintenance

### Health Checks
- Monitor rating calculation job execution
- Track error rates and performance metrics
- Alert on job failures or high error rates

### Maintenance Operations
- Periodic rating recalculation to fix any inconsistencies
- Cleanup of books with no reviews
- Performance monitoring of rating update operations

## Testing

The system includes comprehensive tests:

### Unit Tests
- `rating.service.test.ts` - Core rating calculation logic
- `rating-recalculation.job.test.ts` - Background job functionality

### Integration Tests
- End-to-end rating updates through review operations
- API endpoint testing
- Database consistency validation

### Test Coverage
- 100% coverage of rating calculation logic
- Error scenarios and edge cases
- Performance and reliability testing

## Usage Examples

### Manual Rating Recalculation
```bash
# Trigger manual recalculation (admin endpoint)
curl -X POST /api/ratings/recalculate \
  -H "Authorization: Bearer <admin-token>"
```

### Get Rating Statistics
```bash
# Get detailed rating stats for a book
curl /api/ratings/book/book-id-123/stats
```

### Response Format
```json
{
  "success": true,
  "data": {
    "averageRating": 4.2,
    "reviewCount": 15,
    "ratingDistribution": {
      "1": 1,
      "2": 0,
      "3": 2,
      "4": 7,
      "5": 5
    }
  },
  "message": "Rating statistics retrieved successfully"
}
```

## Future Enhancements

### Potential Improvements
1. **Weighted Ratings** - Consider review age, reviewer reputation
2. **Real-time Updates** - WebSocket notifications for rating changes
3. **Advanced Analytics** - Trending ratings, rating velocity
4. **Caching Layer** - Redis cache for frequently accessed ratings
5. **Batch Processing** - Queue-based rating updates for high-volume scenarios