-- Add default content pages for footer links
-- Migration: 20250803000001_add_default_content_pages.sql

-- Contact Us Page
INSERT INTO content (
    id,
    title,
    slug,
    body,
    is_published,
    meta_description,
    meta_keywords,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    'Contact Us',
    'contact-us',
    '# Contact Us

Get in touch with the Hobsons Bay Chess Club! We''d love to hear from you.

## Contact Information

**Email:** info@hobsonsbaycc.com  
**Phone:** +61 3 XXXX XXXX  
**Address:** Melbourne, Victoria, Australia

## Club Meetings

We meet regularly for games, tournaments, and social events. Check our [events page](/) for upcoming meetings and tournaments.

## Get Involved

Whether you''re a beginner looking to learn the game or an experienced player seeking competitive matches, we welcome players of all skill levels.

### For New Members
- **Beginner Sessions:** Every Tuesday, 7:00 PM
- **Casual Games:** Friday evenings from 6:00 PM
- **Tournament Play:** Monthly tournaments (see events)

### For Experienced Players
- **Competitive Tournaments:** Monthly rated tournaments
- **Club Championships:** Annual club championship
- **Inter-club Matches:** Regular matches with other clubs

## Frequently Asked Questions

For common questions about membership, events, and club activities, please check our [FAQ page](/content/faq).

## Follow Us

Stay updated with club news and events:
- **Website:** Check this site regularly for event updates
- **Email Newsletter:** Contact us to subscribe to our newsletter

We look forward to welcoming you to our chess community!',
    true,
    'Contact information and details for the Hobsons Bay Chess Club. Get in touch to join our chess community.',
    ARRAY['contact', 'chess club', 'hobsons bay', 'melbourne', 'chess community'],
    NOW(),
    NOW()
);

-- Privacy Policy Page
INSERT INTO content (
    id,
    title,
    slug,
    body,
    is_published,
    meta_description,
    meta_keywords,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    'Privacy Policy',
    'privacy-policy',
    '# Privacy Policy

**Last updated: August 3, 2025**

## Introduction

Hobsons Bay Chess Club ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.

## Information We Collect

### Personal Information
When you register for events or create an account, we may collect:
- Name and contact information (email address, phone number)
- Payment information for event bookings
- Chess rating and playing history (if provided)

### Automatic Information
We automatically collect certain information when you visit our website:
- IP address and browser information
- Pages visited and time spent on our site
- Device information and operating system

## How We Use Your Information

We use the information we collect to:
- Process event registrations and payments
- Communicate about club activities and events
- Improve our website and services
- Comply with legal obligations

## Information Sharing

We do not sell, trade, or otherwise transfer your personal information to third parties except:
- **Service Providers:** We may share information with trusted third parties who assist us in operating our website and conducting our business
- **Legal Requirements:** We may disclose information when required by law or to protect our rights

## Data Security

We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

## Cookies

Our website uses cookies to enhance your browsing experience. You can choose to disable cookies through your browser settings, though this may affect site functionality.

## Your Rights

You have the right to:
- Access your personal information
- Correct inaccurate information
- Request deletion of your information
- Opt-out of communications

## Children''s Privacy

Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13.

## Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.

## Contact Us

If you have questions about this Privacy Policy, please contact us at info@hobsonsbaycc.com.',
    true,
    'Privacy Policy for Hobsons Bay Chess Club website and services.',
    ARRAY['privacy policy', 'data protection', 'hobsons bay chess club'],
    NOW(),
    NOW()
);

-- Terms of Use Page
INSERT INTO content (
    id,
    title,
    slug,
    body,
    is_published,
    meta_description,
    meta_keywords,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    'Terms of Use',
    'terms-of-use',
    '# Terms of Use

**Last updated: August 3, 2025**

## Agreement to Terms

By accessing and using the Hobsons Bay Chess Club website, you accept and agree to be bound by the terms and provision of this agreement.

## Use License

Permission is granted to temporarily download one copy of the materials on Hobsons Bay Chess Club''s website for personal, non-commercial transitory viewing only.

### Under this license you may not:
- Modify or copy the materials
- Use the materials for any commercial purpose or for any public display
- Attempt to reverse engineer any software contained on the website
- Remove any copyright or other proprietary notations from the materials

## Event Bookings and Payments

### Booking Terms
- All event bookings are subject to availability
- Payment is required at the time of booking unless otherwise specified
- Event details, including dates and times, are subject to change

### Cancellation Policy
- Cancellations made more than 48 hours before an event may be eligible for a refund
- Cancellations made less than 48 hours before an event are generally non-refundable
- The club reserves the right to cancel events due to insufficient registrations or unforeseen circumstances

### Refund Policy
- Refunds will be processed to the original payment method
- Processing may take 5-10 business days
- In case of event cancellation by the club, full refunds will be provided

## User Accounts

### Account Responsibility
- You are responsible for maintaining the confidentiality of your account
- You are responsible for all activities that occur under your account
- You must notify us immediately of any unauthorized use of your account

### Prohibited Uses
You may not use our service:
- For any unlawful purpose or to solicit others to unlawful acts
- To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances
- To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate
- To submit false or misleading information

## Content

### User-Generated Content
- You retain rights to any content you submit, post, or display
- By posting content, you grant us a non-exclusive license to use, modify, and display such content
- You are solely responsible for your content and the consequences of posting it

### Our Content
- All content on this website is owned by Hobsons Bay Chess Club or its licensors
- You may not reproduce, distribute, or create derivative works without permission

## Disclaimers

The information on this website is provided on an ''as is'' basis. To the fullest extent permitted by law, Hobsons Bay Chess Club excludes all representations, warranties, conditions, and terms except those expressly set out in these terms.

## Limitations

In no event shall Hobsons Bay Chess Club or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on this website.

## Modifications

Hobsons Bay Chess Club may revise these terms of service at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.

## Governing Law

These terms and conditions are governed by and construed in accordance with the laws of Victoria, Australia.

## Contact Information

If you have any questions about these Terms of Use, please contact us at info@hobsonsbaycc.com.',
    true,
    'Terms of Use for the Hobsons Bay Chess Club website and services.',
    ARRAY['terms of use', 'legal', 'hobsons bay chess club', 'conditions'],
    NOW(),
    NOW()
);

-- FAQ Page
INSERT INTO content (
    id,
    title,
    slug,
    body,
    is_published,
    meta_description,
    meta_keywords,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    'Frequently Asked Questions',
    'faq',
    '# Frequently Asked Questions

## General Questions

### What is the Hobsons Bay Chess Club?
The Hobsons Bay Chess Club is a community organization dedicated to promoting chess in the Hobsons Bay area. We welcome players of all skill levels, from complete beginners to experienced tournament players.

### Where do you meet?
We meet at various locations in the Hobsons Bay area. Specific venue details are provided with each event listing. Check our [events page](/) for current meeting locations.

### When do you meet?
We have regular meetings throughout the week:
- **Beginner Sessions:** Tuesdays at 7:00 PM
- **Casual Games:** Fridays from 6:00 PM
- **Tournament Play:** Monthly (see events calendar)

## Membership

### How do I join the club?
Simply attend one of our events or contact us at info@hobsonsbaycc.com. We welcome new members at any time!

### Is there a membership fee?
Annual membership fees apply. Please contact us for current membership rates and payment options.

### Do I need to know how to play chess to join?
Not at all! We welcome complete beginners and offer regular teaching sessions. Our experienced members are always happy to help newcomers learn the game.

### What if I''m a beginner?
We have dedicated beginner sessions every Tuesday evening where you can learn the basics and practice in a friendly, supportive environment.

## Events and Tournaments

### How do I register for events?
You can register for events through our online booking system. Simply visit the [events page](/) and click on the event you''re interested in.

### Can I cancel my event registration?
Yes, cancellations made more than 48 hours before an event may be eligible for a refund. See our [Terms of Use](/content/terms-of-use) for full details.

### What should I bring to events?
We provide chess sets and boards for most events. Just bring yourself and enthusiasm for the game! For tournament play, you may want to bring your own chess clock if you have one.

### Are refreshments provided?
Light refreshments are usually available at our events. Specific details are included in event descriptions.

## Tournament Play

### Do I need a chess rating to play in tournaments?
No, you don''t need an official rating. We welcome unrated players and can help you get started with rated play if you''re interested.

### What time controls do you use?
We use various time controls depending on the event. Common formats include:
- Rapid games (15-30 minutes per player)
- Standard games (60-90 minutes per player)
- Blitz tournaments (3-5 minutes per player)

### How are tournaments organized?
Most tournaments use Swiss system pairings, ensuring you play opponents of similar strength. We typically run 4-6 rounds depending on the number of participants.

## Equipment and Facilities

### Do you provide chess sets?
Yes, we provide chess sets, boards, and clocks for all club activities.

### Is the venue accessible?
We strive to use accessible venues for all our events. Please contact us if you have specific accessibility requirements.

### Is parking available?
Parking information is provided in the event details for each venue.

## Online Services

### How do I create an account on your website?
You can create an account when registering for your first event. This allows you to track your registrations and receive club updates.

### I forgot my password. How can I reset it?
Contact us at info@hobsonsbaycc.com and we''ll help you reset your password.

### Do you have an online chess platform?
While we primarily focus on over-the-board play, we occasionally organize online events. Check our events calendar for details.

## Contact and Communication

### How can I contact the club?
- **Email:** info@hobsonsbaycc.com
- **Website:** Check our [contact page](/content/contact-us) for full details

### Do you have a newsletter?
Yes! Contact us to subscribe to our newsletter for regular updates on events, club news, and chess tips.

### Can I suggest event ideas or provide feedback?
Absolutely! We welcome suggestions and feedback from our members. Please email us with your ideas.

## Still Have Questions?

If you can''t find the answer to your question here, please don''t hesitate to [contact us](/content/contact-us). We''re always happy to help!',
    true,
    'Frequently asked questions about the Hobsons Bay Chess Club, membership, events, and services.',
    ARRAY['faq', 'questions', 'chess club', 'hobsons bay', 'help'],
    NOW(),
    NOW()
);

COMMENT ON TABLE content IS 'Content management system with default pages added for footer links';
