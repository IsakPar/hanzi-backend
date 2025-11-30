-- Update templates with custom SVG icon URLs
-- Base URL: https://content.hanzimaster.com/icons/templates/

UPDATE announcement_templates SET default_schema = 
'{"type":"bottom_sheet","style":{"backgroundGradient":"linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)","textColor":"#ffffff"},"content":{"iconUrl":"https://content.hanzimaster.com/icons/templates/update-rocket.svg","title":"New Version Available!","subtitle":"v2.0 brings exciting features","body":"Update now to unlock new lessons, improved AI tutoring, and bug fixes."},"primaryCta":{"text":"Update Now →","action":"open_store"},"secondaryCta":{"text":"Remind Me Later","action":"dismiss"},"dismissible":true,"showOnce":false}'
WHERE id = 'update_required';

UPDATE announcement_templates SET default_schema = 
'{"type":"fullscreen","style":{"backgroundGradient":"linear-gradient(180deg, #7C3AED 0%, #DB2777 50%, #F59E0B 100%)","textColor":"#ffffff"},"content":{"iconUrl":"https://content.hanzimaster.com/icons/templates/flash-sale.svg","eyebrow":"LIMITED TIME","title":"50% OFF","subtitle":"Premium Lifetime Access","body":"Unlock all HSK levels, offline mode, and AI tutoring.","urgency":"Ends in 48 hours"},"primaryCta":{"text":"Claim My Discount","action":"navigate","route":"/premium"},"secondaryCta":{"text":"No thanks","action":"dismiss"},"dismissible":true,"showOnce":true}'
WHERE id = 'promotion';

UPDATE announcement_templates SET default_schema = 
'{"type":"modal","style":{"backgroundGradient":"linear-gradient(180deg, #991B1B 0%, #7F1D1D 100%)","textColor":"#ffffff","border":"2px solid #FCD34D"},"content":{"iconUrl":"https://content.hanzimaster.com/icons/templates/christmas-tree.svg","title":"Merry Christmas!","body":"From all of us at HanziMaster, we wish you joy, peace, and wonderful learning in the new year!","signature":"— The HanziMaster Team"},"primaryCta":{"text":"Thank You!","action":"dismiss"},"dismissible":true,"showOnce":true}'
WHERE id = 'christmas';

UPDATE announcement_templates SET default_schema = 
'{"type":"fullscreen","style":{"backgroundGradient":"linear-gradient(180deg, #DC2626 0%, #991B1B 100%)","textColor":"#FEF3C7"},"content":{"iconUrl":"https://content.hanzimaster.com/icons/templates/red-envelope.svg","eyebrow":"龙年大吉","title":"新年快乐!","subtitle":"Happy Chinese New Year","body":"Wishing you prosperity, health, and happiness in the Year of the Dragon!"},"primaryCta":{"text":"Receive Blessing","action":"dismiss"},"dismissible":true,"showOnce":true}'
WHERE id = 'chinese_new_year';

UPDATE announcement_templates SET default_schema = 
'{"type":"modal","style":{"backgroundGradient":"linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)","textColor":"#1F2937"},"content":{"iconUrl":"https://content.hanzimaster.com/icons/templates/trophy.svg","title":"Achievement Unlocked!","subtitle":"First Lesson Complete!","body":"Amazing work! You''ve taken your first step on your Chinese learning journey."},"primaryCta":{"text":"Continue Learning","action":"dismiss"},"dismissible":true,"showOnce":true}'
WHERE id = 'achievement';

UPDATE announcement_templates SET default_schema = 
'{"type":"modal","style":{"backgroundGradient":"linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)","textColor":"#ffffff"},"content":{"iconUrl":"https://content.hanzimaster.com/icons/templates/sparkle-star.svg","eyebrow":"NEW FEATURE","title":"AI Conversation Practice","body":"Practice real conversations with our new AI tutor. Get instant feedback on pronunciation and grammar!"},"primaryCta":{"text":"Try It Now","action":"navigate","route":"/practice"},"secondaryCta":{"text":"Later","action":"dismiss"},"dismissible":true,"showOnce":true}'
WHERE id = 'new_feature';

UPDATE announcement_templates SET default_schema = 
'{"type":"banner","style":{"backgroundColor":"#F59E0B","textColor":"#1F2937"},"content":{"iconUrl":"https://content.hanzimaster.com/icons/templates/maintenance-gear.svg","title":"Scheduled Maintenance","subtitle":"Tonight 2-4 AM EST","body":"We''re making improvements to serve you better."},"primaryCta":{"text":"Got It","action":"dismiss"},"dismissible":true,"showOnce":false}'
WHERE id = 'maintenance';

UPDATE announcement_templates SET default_schema = 
'{"type":"fullscreen","style":{"backgroundGradient":"linear-gradient(180deg, #0F172A 0%, #1E3A8A 50%, #3B82F6 100%)","textColor":"#ffffff"},"content":{"iconUrl":"https://content.hanzimaster.com/icons/templates/welcome-wave.svg","title":"Welcome to HanziMaster!","subtitle":"你好！","body":"Your journey to Chinese fluency starts here. Let''s begin with the basics!"},"primaryCta":{"text":"Start Learning","action":"navigate","route":"/lessons"},"dismissible":false,"showOnce":true}'
WHERE id = 'welcome';

UPDATE announcement_templates SET default_schema = 
'{"type":"modal","style":{"backgroundGradient":"linear-gradient(135deg, #F97316 0%, #EF4444 100%)","textColor":"#ffffff"},"content":{"iconUrl":"https://content.hanzimaster.com/icons/templates/flame-streak.svg","eyebrow":"STREAK ALERT","title":"7 Day Streak!","body":"Don''t break your streak! Just 5 minutes today keeps your progress on track."},"primaryCta":{"text":"Keep My Streak","action":"navigate","route":"/lessons"},"secondaryCta":{"text":"Skip Today","action":"dismiss"},"dismissible":true,"showOnce":false}'
WHERE id = 'streak_reminder';

UPDATE announcement_templates SET default_schema = 
'{"type":"modal","style":{"backgroundColor":"#1F2937","textColor":"#ffffff"},"content":{"iconUrl":"https://content.hanzimaster.com/icons/templates/star-rating.svg","title":"Enjoying HanziMaster?","body":"Your review helps other learners discover us and keeps us motivated to build more features!"},"primaryCta":{"text":"Rate 5 Stars","action":"open_store"},"secondaryCta":{"text":"Maybe Later","action":"dismiss"},"dismissible":true,"showOnce":true}'
WHERE id = 'rating_request';

UPDATE announcement_templates SET default_schema = 
'{"type":"modal","style":{"backgroundGradient":"linear-gradient(135deg, #10B981 0%, #059669 100%)","textColor":"#ffffff"},"content":{"iconUrl":"https://content.hanzimaster.com/icons/templates/gift-referral.svg","eyebrow":"EARN REWARDS","title":"Invite Friends, Get Premium!","subtitle":"1 Month Free Premium","body":"Share HanziMaster with friends. When they sign up, you both get rewarded!"},"primaryCta":{"text":"Invite & Earn","action":"navigate","route":"/referral"},"secondaryCta":{"text":"Not Now","action":"dismiss"},"dismissible":true,"showOnce":true}'
WHERE id = 'referral';

UPDATE announcement_templates SET default_schema = 
'{"type":"modal","style":{"backgroundColor":"#1F2937","textColor":"#ffffff","borderRadius":24},"content":{"iconUrl":"https://content.hanzimaster.com/icons/templates/megaphone.svg","title":"Announcement","body":"Your message here..."},"primaryCta":{"text":"OK","action":"dismiss"},"dismissible":true,"showOnce":true}'
WHERE id = 'custom';

UPDATE announcement_templates SET default_schema = 
'{"type":"modal","style":{"backgroundColor":"#18181B","textColor":"#A1A1AA","borderRadius":16},"content":{"iconUrl":"https://content.hanzimaster.com/icons/templates/code-brackets.svg","title":"Custom SDUI","body":"Edit the JSON to create any layout you want."},"primaryCta":{"text":"Close","action":"dismiss"},"dismissible":true,"showOnce":true}'
WHERE id = 'json';

-- Also update the icon column to show the SVG icon names
UPDATE announcement_templates SET icon = 'rocket' WHERE id = 'update_required';
UPDATE announcement_templates SET icon = 'lightning' WHERE id = 'promotion';
UPDATE announcement_templates SET icon = 'tree' WHERE id = 'christmas';
UPDATE announcement_templates SET icon = 'envelope' WHERE id = 'chinese_new_year';
UPDATE announcement_templates SET icon = 'trophy' WHERE id = 'achievement';
UPDATE announcement_templates SET icon = 'sparkle' WHERE id = 'new_feature';
UPDATE announcement_templates SET icon = 'gear' WHERE id = 'maintenance';
UPDATE announcement_templates SET icon = 'wave' WHERE id = 'welcome';
UPDATE announcement_templates SET icon = 'flame' WHERE id = 'streak_reminder';
UPDATE announcement_templates SET icon = 'star' WHERE id = 'rating_request';
UPDATE announcement_templates SET icon = 'gift' WHERE id = 'referral';
UPDATE announcement_templates SET icon = 'megaphone' WHERE id = 'custom';
UPDATE announcement_templates SET icon = 'code' WHERE id = 'json';

