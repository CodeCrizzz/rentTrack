# RENTTRACK — CHAPTER 3 CORRECTED SECTIONS

*Drop-in replacement for the Requirement Specifications, Data Flow Diagram, and Use Case Diagram sections of Chapter 3*

This document replaces the affected sections of Chapter 3 so that the chapter text, the data flow diagram, and the use case diagram describe the same nine core features stated in Chapter 1: Manage Room, Manage Tenants, Bills and Payments, Maintenance Request, Chat, Generate Report, CCTV Monitoring, Backup and Recovery, and Activity Logs. Two supporting services, Manage User Login and Manage Email Notifications, are retained because Chapter 1 promises them and the implemented system provides them.

What was wrong in the previous version: the functional requirements table had no Chat, no Backup and Recovery, and no Activity Logs; it listed SMS Notifications, but the system sends email through SMTP; the data flow diagram had seven processes instead of ten; and the activity log was described as a database table that does not exist in the schema.


## A.  Requirement Specifications


### Functionality Requirements

The functional and technical prerequisites of the RentTrack platform are outlined in this section. These specifications dictate how the web-based boarding house management system will operate, detailing its core operational capabilities, required data inputs, expected outputs, and the specific hardware and software environments needed for full deployment.

Table 1 lists the eleven functional requirements of the system. The nine core features of RentTrack are Manage Room, Manage Tenants, Bills and Payments, Maintenance Request, Chat, Generate Report, CCTV Monitoring, Backup and Recovery, and Activity Logs. Manage User Login and Manage Email Notifications are supporting services that enable the core features.


**Table 1. Functional Requirements**

| Functional Requirements | Description |
|---|---|
| Manage User Login | Provides secure authentication for administrators and tenants through email and password or Google Sign-In, loads the correct role and permissions after login, and blocks accounts that are still pending approval. |
| Manage Room | Allows the administrator to add and update room information such as room number, type, floor, bed capacity, monthly rate, amenities, gender restriction, and status, and to monitor occupancy and availability in real time. |
| Manage Tenants | Allows the administrator to review new tenant registrations, approve or decline accounts, add and update tenant profiles, assign a room and bedspace, and process move-in and move-out records. |
| Bills and Payments | Automatically computes the monthly bill of every active tenant from base rent, water and electricity submeter consumption, and applicable fees; records payments made through QR Ph or cash; tracks outstanding balances; and issues digital statements and receipts. |
| Maintenance Request | Allows tenants to submit repair concerns with a description, category, priority level, and photo attachment, and allows the administrator to review, assign, and update each ticket from Pending to In Progress to Resolved. |
| Chat | Provides real-time two-way messaging between tenants and the administrator, keeps the conversation history, and delivers property-wide announcements to the tenant portal. |
| Generate Report | Produces financial, occupancy, delinquency, and maintenance reports for a selected date range, with print and CSV export for official record keeping. |
| CCTV Monitoring | Embeds live video from authorized IP cameras into the administrator dashboard so that entrances, hallways, and other designated areas can be monitored in real time. |
| Backup and Recovery | Allows the administrator to create, download, and restore database backup files, and supports scheduled automatic backups that protect tenant, room, billing, payment, and maintenance records against data loss. |
| Activity Logs | Compiles a single chronological record of the changes made by tenants and by administrators across accounts, payments, maintenance requests, messages, and announcements, and presents it to the administrator for audit and troubleshooting. |
| Manage Email Notifications | Sends automated email through the property's SMTP account for account approval, upcoming payment due dates, and overdue bills. |


### Table 2. Input Requirements

This section describes the specific data and information that users must enter into the system to perform the operations listed in Table 1.


**Table 2. Input Requirements**

| Input Requirements | Description |
|---|---|
| Manage User Login | Registered email address and password, or a Google account for Google Sign-In. |
| Manage Room | Room number, room type, floor, bed capacity, monthly rate, amenities, gender restriction, and room status. |
| Manage Tenants | Full name, email address, contact number, emergency contact, home address, gender, identification document, assigned room and bedspace, move-in date, and contract end date. |
| Bills and Payments | Billing month, due date, base rent, water submeter reading, electricity submeter reading, other fees, amount paid, payment method, reference number, and proof of payment. |
| Maintenance Request | Room number, issue category, priority level, description of the problem, and an optional photo attachment. |
| Chat | Recipient, message content, and, for announcements, the announcement title, content, and type. |
| Generate Report | Report type (financial, occupancy, delinquency, or maintenance), date range, and optional tenant or room filter. |
| CCTV Monitoring | Camera label, camera stream (RTSP) address or credentials, and an enabled flag for each authorized camera. |
| Backup and Recovery | Backup label, destination folder, schedule setting (manual, daily, or weekly), and the backup file selected for restoration. |
| Activity Logs | Log filter (all, payment, maintenance, tenant, announcement, or message) and date range. |
| Manage Email Notifications | Recipient address and the notification trigger to send: account approval, upcoming due date, or overdue bill. |


### Table 3. Output Requirements

These are the main results or information that the system produces after processing the inputs listed in Table 2.


**Table 3. Output Requirements**

| Output Requirements | Description |
|---|---|
| Manage User Login | Displays the dashboard for the account's role after a successful login, or an error message for incorrect credentials or an account that is still pending approval. |
| Manage Room | Displays a room list and occupancy grid showing each room as Vacant, Occupied, Full, or under Maintenance, together with bed availability and monthly rates. |
| Manage Tenants | Displays the saved tenant profile in a structured list with the account status and assigned room, and confirms when a record is added, approved, or updated. |
| Bills and Payments | Produces a digital billing statement with itemized charges, an updated outstanding balance, a digital receipt after a verified payment, and a collection summary. |
| Maintenance Request | Displays a tracking list showing each ticket's category, priority, assigned personnel, and current status of Pending, In Progress, or Resolved. |
| Chat | Displays the conversation thread with delivery and unread indicators, and publishes announcements to the tenant portal. |
| Generate Report | Produces formatted, printable documents covering income, occupancy, delinquency, and maintenance, together with a downloadable CSV export. |
| CCTV Monitoring | Displays a continuous live video stream of the designated boarding house areas on the administrator's screen. |
| Backup and Recovery | Produces a downloadable backup archive containing the system's stored records, reports the date and result of the last backup, and confirms the outcome of a restore. |
| Activity Logs | Displays a chronological list of recorded changes with the event type, affected record, tenant or administrator involved, and timestamp. |
| Manage Email Notifications | Sends the email message to the tenant and records the delivery attempt in the system notification records. |

> **Note:** Unchanged: Table 4 (Software Requirements) and Table 5 (Hardware Requirements) do not need any revision.


## B.  Diagrams


### Context Diagram

The context diagram in Figure 3 shows the overall interaction among the Tenant, the Admin/Owner, and the RentTrack Boarding House Management System. The Tenant provides registration details, room or bedspace selection, payment information, maintenance requests, and chat messages. The Admin/Owner manages tenant records, room information, bills, payments, maintenance requests, announcements, backups, and reports. The system also exchanges data with four supporting services: Xendit for QR Ph payment confirmation, the CCTV provider for RTSP video streams, the email service for SMTP notifications, and a scheduler for monthly billing and automatic backups. In return, the system provides room availability, billing details, payment records, maintenance status, announcements, live video, reports, and backup archives.


### Data Flow Diagram

The Data Flow Diagram (DFD) in Figure 4 provides a decomposed, modular view of the RentTrack Boarding House Management System. It illustrates how the external entities interact with ten core processes and eight data stores. The external entities are the Tenant, the Administrator, the Xendit Payment Gateway, the CCTV Provider, the Email Service, and the Scheduler. The eight data stores correspond exactly to the tables in the database: D1 users, D2 rooms, D3 bills, D4 payments, D5 requests, D6 messages, D7 announcements, and D8 notifications.

Below is the systematic explanation of each operational process.


#### 1.0  Authenticate User Login

This process manages access to RentTrack by verifying login credentials. When a tenant or administrator attempts to log in, the system validates the submitted email address and password, or the Google account assertion, against the user accounts in D1 users. If the credentials match and the account status is active, access is granted and the correct role and permissions are loaded through a secure session token. If the credentials are incorrect, or the account is still pending approval, the system returns an error and denies entry. This process protects tenant data and restricts administrative functions to authorized users.


#### 2.0  Manage Room

This process manages room and bedspace information. The administrator records the room number, type, floor, bed capacity, monthly rate, amenities, gender restriction, and status, and the system stores these details in D2 rooms. Because capacity and tenant assignments are evaluated together, the system can report each room as vacant, partially occupied, fully occupied, or under maintenance without overbooking. Tenants read the resulting availability from the same store when they view the room inventory in the tenant portal.


#### 3.0  Manage Tenants

This process manages tenant accounts and room allocations. New applicants submit registration details, which are written to D1 users with a pending status. The administrator reviews each application, approves or declines it, assigns a room and bedspace held in D2 rooms, and records move-in and contract-end dates. Approved tenants are promoted to active status and can then use the tenant portal. This process keeps tenant profiles, occupancy counts, and room availability consistent with one another.


#### 4.0  Bills and Payments

This process handles the monthly billing cycle and the settlement of charges. On the monthly schedule supplied by the Scheduler, the system computes each active tenant's bill from base rent, water and electricity submeter consumption, and other fees, and stores the statement in D3 bills. When a tenant pays, the tenant scans the property's QR Ph code and the Xendit Payment Gateway returns the transaction result, which the system records in D4 payments and credits against the open bill. Cash payments submitted with proof are verified by the administrator before being recorded. Every confirmed payment updates the remaining balance, writes a notification to D8 notifications, and triggers a receipt email through the Email Service. Reminder emails for upcoming and overdue bills are also issued by this process.


#### 5.0  Manage Maintenance Request

This process tracks facility defects and resident concerns. A tenant submits a request with a category such as plumbing, electrical, structural, or appliance, a priority level, a description, and an optional photo, and the ticket is stored in D5 requests with a Pending status. The administrator reviews the ticket, assigns personnel, and records status changes as the work progresses to In Progress and finally Resolved. Each status change writes a notification to D8 notifications so that the tenant can follow the ticket through its life cycle.


#### 6.0  Chat

This process carries communication between residents and management. A tenant sends a direct message to the administrator and the conversation is stored in D6 messages with the sender, recipient, content, and timestamp, so that both parties can review the thread and unread counts. When the administrator publishes a property announcement, the record is written to D7 announcements and a matching notification is written to D8 notifications, which is how the latest notice appears in the tenant portal. This process keeps ordinary conversation and property-wide notices separate, while making both auditable.


#### 7.0  Generate Report

This process produces the administrative reports. When the administrator requests a report and selects a date range, the process reads room and occupancy data from D2 rooms, billing and collection figures from D3 bills, payment transactions from D4 payments, and work-order records from D5 requests. The figures are consolidated into financial, occupancy, delinquency, and maintenance sections, which can be printed or exported as a CSV file. The process only reads from the data stores; it does not create a separate reporting store.


#### 8.0  CCTV Monitoring

This process provides live premises monitoring. The administrator opens the CCTV page and the system connects to the configured cameras through the CCTV Provider, which supplies RTSP video streams. Each camera is identified by a label and an authorized stream address, and only an authenticated administrator can view the feeds. No footage is written to the database; the process is read-only with respect to the data stores and exists to give the administrator real-time visibility of entrances, hallways, and other designated areas.


#### 9.0  Backup and Recovery

This process protects the system's records. When the administrator requests a backup, or when the Scheduler triggers the configured schedule, the system reads the current contents of D1 users, D2 rooms, D3 bills, D4 payments, D5 requests, D6 messages, D7 announcements, and D8 notifications and writes them to a timestamped archive file outside the database. The administrator can download the archive or select an earlier archive to restore, in which case the records in the affected data stores are replaced with the contents of the archive. The process also reports the date and result of the most recent backup.


#### 10.0  Activity Logs

This process gives the administrator a single chronological record of data changes made by tenants and by administrators. When an activity log is requested, the process reads the changes produced by both parties: account records from D1 users, payment activity from D4 payments, maintenance activity from D5 requests, messages from D6 messages, and announcements from D7 announcements. Each record is normalized into a common event with a type, title, reference number, tenant, room, amount, status, and timestamp, and the events are merged and sorted newest first. The process only reads from the data stores; it does not maintain a separate log table, so it reports the current state of each changed record rather than a field-by-field before-and-after history.

> **Note:** Data stores used by the diagram: D1 users, D2 rooms, D3 bills, D4 payments, D5 requests, D6 messages, D7 announcements, D8 notifications. Previous versions of this chapter labelled the maintenance store as 'D5 Maintenance requests' and combined messages and notifications into a single store; both must be updated to the names above so that the chapter matches Figure 4 and the database.


### Use Case Diagram

The Use Case Diagram in Figure 5 shows the interaction between the actors and the nine core features of RentTrack. Two primary actors use the system: the Tenant and the Admin/Owner. Four supporting actors participate in specific use cases without operating the interface: the Xendit Payment Gateway confirms QR Ph payments, the CCTV Provider supplies live video, the Email Service delivers notifications, and the Scheduler triggers monthly billing and automatic backups.

The nine core features are drawn in Figure 5 as the high-level use cases inside the system boundary: Manage Room, Manage Tenants, Bills and Payments, Maintenance Request, Chat, Generate Report, CCTV Monitoring, Backup and Recovery, and Activity Logs. Log In or Log Out is drawn as a tenth use case because both actors require it. The Tenant connects to the use cases that tenants perform, the Admin/Owner connects to the administrative use cases, and the four supporting actors connect only to the use case in which they participate.


**Table 6. Core Feature to Use Case Mapping**

| Core Feature | Use Case in Figure 5 | Actor(s) |
|---|---|---|
| Manage Room | Manage Room | Admin/Owner |
| Manage Tenants | Manage Tenants | Admin/Owner, Tenant |
| Bills and Payments | Bills and Payments | Admin/Owner, Tenant, Xendit Payment Gateway, Email Service |
| Maintenance Request | Maintenance Request | Tenant, Admin/Owner |
| Chat | Chat | Tenant, Admin/Owner |
| Generate Report | Generate Report | Admin/Owner |
| CCTV Monitoring | CCTV Monitoring | Admin/Owner, CCTV Provider |
| Backup and Recovery | Backup and Recovery | Admin/Owner, Scheduler |
| Activity Logs | Activity Logs | Admin/Owner |
| Supporting service | Log In or Log Out | Tenant, Admin/Owner |

Each high-level use case in Figure 5 is made up of detailed goals that the actors perform. These detailed use cases are listed below and are what the system actually implements; they are grouped under the core feature that contains them.


#### 1. Register Account

A new tenant creates an account by entering the required personal information. The Admin/Owner reviews the registration and approves or declines it.


#### 2. Log In or Log Out

Tenants and administrators authenticate with their email and password or a Google account, and end the session when they are finished with the system.


#### 3. Manage Profile

A tenant views and updates their personal information so that account details stay current.


#### 4. Add or Update Room

The Admin/Owner creates a room or edits its number, type, floor, capacity, rate, amenities, gender restriction, and status.


#### 5. View Room and Occupancy Status

Tenants and the Admin/Owner view room and bedspace availability, occupancy counts, and whether each room is vacant, occupied, full, or under maintenance.


#### 6. Assign Tenant to Room and Bedspace

The Admin/Owner assigns an approved tenant to a specific room and bedspace, which updates the occupancy of that room.


#### 7. Manage Tenant Profiles

The Admin/Owner views, adds, and updates tenant information, keeping tenant records organized.


#### 8. Approve or Decline Registration

The Admin/Owner reviews each pending registration and approves or declines the account based on the submitted information.


#### 9. Record Move-in or Move-out

The Admin/Owner records a tenant's move-in date, contract-end date, and eventual move-out, which releases the assigned bedspace.


#### 10. Generate Monthly Bills

The system, triggered by the Scheduler or by the Admin/Owner, computes each active tenant's bill from base rent, submeter readings, and other fees.


#### 11. View Bills and Payment History

Tenants check their statements, outstanding balances, and past payments. The Admin/Owner can view the same records for any tenant.


#### 12. Pay Bill via QR Ph

A tenant scans the property's QR Ph code with a participating bank or e-wallet application and receives confirmation once the Xendit Payment Gateway verifies the transaction.


#### 13. Record and Verify Payment

The Admin/Owner records a cash payment or verifies a submitted proof of payment, which credits the amount to the tenant's open bill.


#### 14. Submit Maintenance Request

A tenant reports a problem by entering a category, priority level, description, and optional photo.


#### 15. Track Request Status

The tenant follows the ticket as it moves from Pending to In Progress to Resolved.


#### 16. Assign and Resolve Request

The Admin/Owner reviews the ticket, assigns personnel, and updates its status until the issue is resolved.


#### 17. Message Administrator

A tenant sends a direct message to the administrator regarding questions or concerns and reads the reply in the conversation thread.


#### 18. Chat with Tenants

The Admin/Owner reads and replies to tenant messages from the administration chat screen.


#### 19. Publish Announcements

The Admin/Owner posts a property-wide notice, which becomes visible to all tenants.


#### 20. View Announcements and Notifications

Tenants read the latest announcements and receive account, billing, and maintenance notifications.


#### 21. Generate Report

The Admin/Owner produces financial, occupancy, delinquency, and maintenance reports for a selected date range.


#### 22. Print or Export Report

The Admin/Owner prints the report or exports it as a CSV file for official record keeping.


#### 23. Monitor CCTV Live Feed

The Admin/Owner views live video from the authorized cameras connected through the CCTV Provider.


#### 24. Create Backup

The Admin/Owner, or the Scheduler on the configured schedule, creates a timestamped archive of the system's records.


#### 25. Download Backup

The Admin/Owner downloads an existing backup archive for off-site storage.


#### 26. Restore Backup

The Admin/Owner selects an archive and restores the system's records from it after a failure or data loss.


#### 27. View Activity Logs

The Admin/Owner reviews the chronological record of tenant and administrator changes for audit and troubleshooting.


### Entity Relationship Diagram

> **Note:** One correction is required in Figure 6 and its supporting text. The ERD currently presents nine entities, including a Settings entity. The implemented database contains the eight tables that appear in the data flow diagram: users, rooms, bills, payments, requests, messages, announcements, and notifications. The QR configuration is stored as a JSON file on disk, not as a table, and there is no activity log table because process 10.0 derives the log from existing records. Either remove the Settings entity from the ERD, or add a settings table to the database so that the ERD and the data flow diagram agree.

The Data Dictionary section is unchanged and already covers the eight tables listed above.


## C.  Chapter 2 Corrections

Two items in Chapter 2 still refer to an earlier version of the study and must be updated.


**Table 7. Chapter 2 Find and Replace**

| Location | Current text | Replace with |
|---|---|---|
| Paragraph 1 of the chapter introduction | "Web-Based Boarding House Management and Tenant Monitoring System with Billing System" | "RentTrack: A Web-Based Boarding House Management System with Automated Billing and Maintenance Tracking" |
| Second occurrence, in the Synthesis section | The same earlier system title | The same corrected title |
| Synthesis, gap statement | "tenant monitoring, room availability, billing, payment recording, SMS notifications, and CCTV live monitoring" | "tenant monitoring, room availability, billing, payment recording, email notifications, CCTV live monitoring, data backup and recovery, and activity logging" |

After these replacements, Chapter 2 no longer names a different system or promises SMS, and its identified research gap covers the two features that Chapter 3 previously omitted.


## D.  Feature Traceability

The table below can be used during the defense to show that every core feature is stated in Chapter 1, required in Chapter 3, drawn in the data flow diagram, and drawn in the use case diagram.


**Table 8. Traceability of the Nine Core Features**

| Core feature | Chapter 1 | Chapter 3 process | Data stores | Use cases |
|---|---|---|---|---|
| Manage Room | Scope; Objective 2 | 2.0 Manage Room | D2 rooms | 4, 5, 6 |
| Manage Tenants | Scope; Objective 2 | 3.0 Manage Tenants | D1 users, D2 rooms | 7, 8, 9 |
| Bills and Payments | Objectives 3 and 4 | 4.0 Bills and Payments | D3 bills, D4 payments, D8 notifications | 10, 11, 12, 13 |
| Maintenance Request | Objective 5 | 5.0 Maintenance Request | D5 requests, D8 notifications | 14, 15, 16 |
| Chat | Objective 6 | 6.0 Chat | D6 messages, D7 announcements, D8 notifications | 17, 18, 19, 20 |
| Generate Report | Objective 7 | 7.0 Generate Report | D2, D3, D4, D5 (read only) | 21, 22 |
| CCTV Monitoring | Objective 7 | 8.0 CCTV Monitoring | None (live stream only) | 23 |
| Backup and Recovery | Objective 8 | 9.0 Backup and Recovery | D1 to D8 (archive files) | 24, 25, 26 |
| Activity Logs | Objective 7 | 10.0 Activity Logs | D1, D4, D5, D6, D7 (read only) | 27 |

> **Note:** Figure 3 (Context Diagram), Figure 4 (Data Flow Diagram), Figure 5 (Use Case Diagram), and Figure 6 (Entity Relationship Diagram) must be replaced or redrawn to match this text. The current RentTrack data flow diagram already reports ten processes, eight data stores, and sixty labelled data flows and can be substituted directly for Figure 4.
