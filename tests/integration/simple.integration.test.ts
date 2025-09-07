import request from 'supertest';
import app from '../../src/app';

describe('Simple Integration Test', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.message).toBe('Book Review Platform API is running');
  });

  it('should return 404 for non-existent routes', async () => {
    const response = await request(app)
      .get('/api/nonexistent')
      .expect(404);

    expect(response.body.success).toBe(false);
  });
});