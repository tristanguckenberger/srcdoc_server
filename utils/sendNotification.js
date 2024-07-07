const { query } = require("../config/db");
const { getUserSockets } = require("../ws-server");

exports.sendNotification = async ({
  recipient_id,
  sender_id,
  type,
  entity_id,
  entity_type,
  message,
}) => {
  const result = await query(
    "INSERT INTO notifications (recipient_id, sender_id, type, entity_id, entity_type, message) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [recipient_id, sender_id, type, entity_id, entity_type, message]
  );

  if (result.rows[0]) {
    const userSockets = getUserSockets();
    const client = userSockets?.get(recipient_id);
    console.log("client::", client);
    if (client) {
      client.send(JSON.stringify(result.rows[0]));
    } else {
      console.log("No client found");
      console.log("userSockets::", userSockets);
    }
    console.log("=================");
    return result.rows[0];
  }
};
