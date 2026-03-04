
-- Professional Email Templates for BeatPoppa
UPDATE email_templates
SET body = '
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #000000; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: 900; color: #ffffff; text-decoration: none; letter-spacing: -1px; }
    .card { background-color: #111111; border: 1px solid #222222; border-radius: 24px; padding: 40px; margin-bottom: 24px; }
    h1 { font-size: 32px; font-weight: 900; margin: 0 0 16px; letter-spacing: -1px; }
    p { font-size: 16px; line-height: 1.6; color: #a1a1aa; margin: 0 0 24px; }
    .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 12px; transition: all 0.2s; }
    .footer { text-align: center; font-size: 12px; color: #52525b; }
    .footer a { color: #71717a; text-decoration: underline; }
    .divider { height: 1px; background-color: #222222; margin: 32px 0; }
    .order-item { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
    .order-item-title { font-weight: 700; color: #ffffff; }
    .order-item-price { color: #71717a; margin-left: auto; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="{{site_url}}" class="logo">BEATPOPPA</a>
    </div>
    <div class="card">
      <h1>Order Confirmed!</h1>
      <p>Hello {{user_name}}, your order <strong>#{{order_id}}</strong> has been processed successfully. Your licenses and files are now ready for download.</p>
      
      <div class="divider"></div>
      
      <div style="margin-bottom: 32px;">
        <p style="font-weight: 700; color: #ffffff; margin-bottom: 16px;">Download Your Files</p>
        <a href="{{download_url}}" class="button">Access Download Dashboard</a>
      </div>
      
      <p style="font-size: 14px;">This link will expire in 48 hours for security reasons. You can always access your downloads through your <a href="{{dashboard_url}}">Buyer Dashboard</a>.</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 BeatPoppa. All rights reserved.</p>
      <p>If you have any questions, contact us at <a href="mailto:support@beatpoppa.com">support@beatpoppa.com</a></p>
      <p><a href="{{unsubscribe_url}}">Unsubscribe from transactional updates</a></p>
    </div>
  </div>
</body>
</html>',
variables = '["order_id", "user_name", "download_url", "dashboard_url", "site_url", "unsubscribe_url"]'::jsonb
WHERE name = 'Order Confirmed';

UPDATE email_templates
SET body = '
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #000000; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: 900; color: #ffffff; text-decoration: none; letter-spacing: -1px; }
    .card { background-color: #111111; border: 1px solid #222222; border-radius: 24px; padding: 40px; margin-bottom: 24px; }
    h1 { font-size: 32px; font-weight: 900; margin: 0 0 16px; letter-spacing: -1px; }
    p { font-size: 16px; line-height: 1.6; color: #a1a1aa; margin: 0 0 24px; }
    .rating { color: #facc15; font-size: 24px; margin-bottom: 8px; }
    .comment { background-color: #000000; padding: 20px; border-radius: 12px; color: #ffffff; font-style: italic; border-left: 4px solid #2563eb; }
    .footer { text-align: center; font-size: 12px; color: #52525b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="{{site_url}}" class="logo">BEATPOPPA</a>
    </div>
    <div class="card">
      <h1>New Review Received!</h1>
      <p>A buyer just left a review for your beat <strong>{{beat_title}}</strong>.</p>
      
      <div class="rating">
        {{rating_stars}}
      </div>
      <div class="comment">
        "{{comment}}"
      </div>
      
      <p style="margin-top: 24px;">Check out all your reviews in your <a href="{{dashboard_url}}">Creator Dashboard</a>.</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 BeatPoppa. All rights reserved.</p>
      <p><a href="{{unsubscribe_url}}">Manage email preferences</a></p>
    </div>
  </div>
</body>
</html>',
variables = '["beat_title", "rating_stars", "comment", "dashboard_url", "site_url", "unsubscribe_url"]'::jsonb
WHERE name = 'Review Received';
