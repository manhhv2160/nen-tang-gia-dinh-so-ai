import { db } from '../config/database.js';

export class RsvpRepository {

    static async findByEvent(eventId) {
        const result = await db.query(
            'SELECT * FROM rsvp WHERE event_id = $1',
            [eventId]
        );

        return result.rows;
    }

    static async findById(rsvpId) {
        const result = await db.query(
            'SELECT * FROM rsvp WHERE rsvp_id = $1',
            [rsvpId]
        );

        return result.rows[0];
    }

    static async upsert(eventId, userId, status) {
        const result = await db.query(
            `INSERT INTO rsvp (event_id, user_id, status)
             VALUES ($1, $2, $3)
             ON CONFLICT (event_id, user_id)
             DO UPDATE SET
                 status = EXCLUDED.status,
                 updated_at = NOW()
             RETURNING *, (xmax = 0) AS inserted`,
            [eventId, userId, status]
        );

        return result.rows[0];
    }

    static async delete(rsvpId) {
        const result = await db.query(
            'DELETE FROM rsvp WHERE rsvp_id = $1',
            [rsvpId]
        );

        return result.rowCount > 0;
    }
}