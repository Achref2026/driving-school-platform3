# Enhanced Notification System for Driving School Platform
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import json
import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from enum import Enum

logger = logging.getLogger(__name__)

class NotificationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class NotificationChannel(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"

class EnhancedNotificationService:
    def __init__(self, db_client):
        self.db = db_client.driving_school_platform
        self.smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.environ.get('SMTP_PORT', '587'))
        self.smtp_username = os.environ.get('SMTP_USERNAME')
        self.smtp_password = os.environ.get('SMTP_PASSWORD')
        self.from_email = os.environ.get('FROM_EMAIL', self.smtp_username)

    async def create_notification(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        channels: List[NotificationChannel] = [NotificationChannel.IN_APP],
        metadata: Optional[Dict] = None,
        scheduled_at: Optional[datetime] = None,
        expires_at: Optional[datetime] = None
    ) -> str:
        """Create an enhanced notification with multiple delivery channels"""
        
        notification_id = str(__import__('uuid').uuid4())
        notification_doc = {
            "id": notification_id,
            "user_id": user_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "priority": priority,
            "channels": channels,
            "metadata": metadata or {},
            "is_read": False,
            "is_delivered": False,
            "delivery_status": {},
            "scheduled_at": scheduled_at or datetime.utcnow(),
            "expires_at": expires_at,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await self.db.enhanced_notifications.insert_one(notification_doc)
        
        # If not scheduled for later, send immediately
        if not scheduled_at or scheduled_at <= datetime.utcnow():
            await self._deliver_notification(notification_doc)
        
        return notification_id

    async def _deliver_notification(self, notification: dict):
        """Deliver notification through specified channels"""
        delivery_status = {}
        
        # Get user details
        user = await self.db.users.find_one({"id": notification["user_id"]})
        if not user:
            logger.error(f"User not found for notification {notification['id']}")
            return
        
        # Deliver through each channel
        for channel in notification["channels"]:
            try:
                if channel == NotificationChannel.EMAIL and user.get("email"):
                    success = await self._send_email(user, notification)
                    delivery_status[channel] = {"success": success, "delivered_at": datetime.utcnow()}
                
                elif channel == NotificationChannel.SMS and user.get("phone"):
                    success = await self._send_sms(user, notification)
                    delivery_status[channel] = {"success": success, "delivered_at": datetime.utcnow()}
                
                elif channel == NotificationChannel.PUSH:
                    success = await self._send_push_notification(user, notification)
                    delivery_status[channel] = {"success": success, "delivered_at": datetime.utcnow()}
                
                elif channel == NotificationChannel.IN_APP:
                    # In-app notifications are stored in database (already done)
                    delivery_status[channel] = {"success": True, "delivered_at": datetime.utcnow()}
                
            except Exception as e:
                logger.error(f"Failed to deliver notification via {channel}: {str(e)}")
                delivery_status[channel] = {"success": False, "error": str(e)}
        
        # Update notification with delivery status
        await self.db.enhanced_notifications.update_one(
            {"id": notification["id"]},
            {
                "$set": {
                    "is_delivered": any(status.get("success", False) for status in delivery_status.values()),
                    "delivery_status": delivery_status,
                    "updated_at": datetime.utcnow()
                }
            }
        )

    async def _send_email(self, user: dict, notification: dict) -> bool:
        """Send email notification"""
        if not self.smtp_username or not self.smtp_password:
            logger.warning("SMTP credentials not configured")
            return False
        
        try:
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = user["email"]
            msg['Subject'] = f"🚗 {notification['title']} - Driving School Platform"
            
            # Create HTML email body
            html_body = self._create_email_template(user, notification)
            msg.attach(MIMEText(html_body, 'html'))
            
            # Connect and send email
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.smtp_username, self.smtp_password)
            text = msg.as_string()
            server.sendmail(self.from_email, user["email"], text)
            server.quit()
            
            logger.info(f"Email sent successfully to {user['email']}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return False

    def _create_email_template(self, user: dict, notification: dict) -> str:
        """Create HTML email template"""
        priority_colors = {
            "low": "#28a745",
            "medium": "#ffc107", 
            "high": "#fd7e14",
            "urgent": "#dc3545"
        }
        
        priority_color = priority_colors.get(notification["priority"], "#007bff")
        
        template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{notification['title']}</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 28px;">🚗 Driving School Platform</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">مدرسة تعليم القيادة الجزائرية</p>
                </div>
                
                <!-- Priority Badge -->
                <div style="padding: 20px; border-left: 4px solid {priority_color}; background-color: #f8f9fa;">
                    <div style="display: inline-block; background-color: {priority_color}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                        {notification['priority']} Priority
                    </div>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px;">
                    <h2 style="color: #333; margin-top: 0;">{notification['title']}</h2>
                    <p style="color: #666; line-height: 1.6; font-size: 16px;">{notification['message']}</p>
                    
                    <!-- Metadata -->
                    {self._format_metadata_for_email(notification.get('metadata', {}))}
                </div>
                
                <!-- CTA Button -->
                <div style="padding: 0 30px 30px;">
                    <a href="{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/dashboard" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
                        Open Dashboard
                    </a>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
                    <p style="margin: 0;">This is an automated message from the Driving School Platform</p>
                    <p style="margin: 5px 0 0 0;">🇩🇿 Algeria Driving Education System</p>
                </div>
            </div>
        </body>
        </html>
        """
        return template

    def _format_metadata_for_email(self, metadata: dict) -> str:
        """Format metadata for email display"""
        if not metadata:
            return ""
        
        html = "<div style='background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 20px;'>"
        html += "<h4 style='margin: 0 0 10px 0; color: #495057;'>Additional Information:</h4>"
        
        for key, value in metadata.items():
            if key not in ['internal_id', 'system_data']:  # Skip internal keys
                formatted_key = key.replace('_', ' ').title()
                html += f"<p style='margin: 5px 0; color: #6c757d;'><strong>{formatted_key}:</strong> {value}</p>"
        
        html += "</div>"
        return html

    async def _send_sms(self, user: dict, notification: dict) -> bool:
        """Send SMS notification (placeholder for SMS service integration)"""
        # This would integrate with SMS service like Twilio, Vonage, or local SMS provider
        logger.info(f"SMS would be sent to {user.get('phone', 'N/A')}: {notification['title']}")
        return True  # Simulated success

    async def _send_push_notification(self, user: dict, notification: dict) -> bool:
        """Send push notification (placeholder for push service integration)"""
        # This would integrate with Firebase Cloud Messaging or similar
        logger.info(f"Push notification would be sent to user {user['id']}: {notification['title']}")
        return True  # Simulated success

    async def schedule_reminders(self):
        """Schedule automatic reminders for various events"""
        now = datetime.utcnow()
        
        # Session reminders (24 hours before)
        tomorrow = now + timedelta(days=1)
        sessions_cursor = self.db.sessions.find({
            "scheduled_at": {
                "$gte": tomorrow.replace(hour=0, minute=0, second=0),
                "$lt": tomorrow.replace(hour=23, minute=59, second=59)
            },
            "status": "scheduled"
        })
        
        async for session in sessions_cursor:
            # Check if reminder already sent
            existing_reminder = await self.db.enhanced_notifications.find_one({
                "user_id": session["student_id"],
                "type": "session_reminder",
                "metadata.session_id": session["id"]
            })
            
            if not existing_reminder:
                await self.create_notification(
                    user_id=session["student_id"],
                    notification_type="session_reminder",
                    title="Session Reminder",
                    message=f"You have a {session['session_type']} session scheduled for tomorrow at {session['scheduled_at'].strftime('%H:%M')}",
                    priority=NotificationPriority.HIGH,
                    channels=[NotificationChannel.EMAIL, NotificationChannel.IN_APP],
                    metadata={"session_id": session["id"], "session_type": session["session_type"]}
                )
        
        # Payment reminders (for pending payments older than 3 days)
        three_days_ago = now - timedelta(days=3)
        enrollments_cursor = self.db.enrollments.find({
            "payment_status": "pending",
            "created_at": {"$lt": three_days_ago}
        })
        
        async for enrollment in enrollments_cursor:
            # Check if reminder already sent in last 24 hours
            recent_reminder = await self.db.enhanced_notifications.find_one({
                "user_id": enrollment["student_id"],
                "type": "payment_reminder",
                "metadata.enrollment_id": enrollment["id"],
                "created_at": {"$gte": now - timedelta(hours=24)}
            })
            
            if not recent_reminder:
                school = await self.db.driving_schools.find_one({"id": enrollment["driving_school_id"]})
                await self.create_notification(
                    user_id=enrollment["student_id"],
                    notification_type="payment_reminder",
                    title="Payment Reminder",
                    message=f"Your enrollment payment for {school['name'] if school else 'driving school'} is still pending. Please complete your payment to continue.",
                    priority=NotificationPriority.MEDIUM,
                    channels=[NotificationChannel.EMAIL, NotificationChannel.IN_APP],
                    metadata={"enrollment_id": enrollment["id"], "amount": enrollment["amount"]}
                )

    async def get_user_notifications(
        self,
        user_id: str,
        limit: int = 50,
        skip: int = 0,
        only_unread: bool = False,
        priority_filter: Optional[NotificationPriority] = None
    ) -> dict:
        """Get enhanced notifications for a user"""
        query = {"user_id": user_id}
        
        if only_unread:
            query["is_read"] = False
            
        if priority_filter:
            query["priority"] = priority_filter
        
        # Filter out expired notifications
        now = datetime.utcnow()
        query["$or"] = [
            {"expires_at": None},
            {"expires_at": {"$gte": now}}
        ]
        
        notifications_cursor = self.db.enhanced_notifications.find(query).sort("created_at", -1).skip(skip).limit(limit)
        notifications = await notifications_cursor.to_list(length=limit)
        
        total_unread = await self.db.enhanced_notifications.count_documents({
            "user_id": user_id,
            "is_read": False,
            "$or": [
                {"expires_at": None},
                {"expires_at": {"$gte": now}}
            ]
        })
        
        return {
            "notifications": self._serialize_notifications(notifications),
            "total_unread": total_unread,
            "limit": limit,
            "skip": skip
        }

    def _serialize_notifications(self, notifications: list) -> list:
        """Serialize notifications for JSON response"""
        serialized = []
        for notification in notifications:
            serialized_notification = {}
            for key, value in notification.items():
                if key == '_id':
                    continue
                elif isinstance(value, datetime):
                    serialized_notification[key] = value.isoformat()
                else:
                    serialized_notification[key] = value
            serialized.append(serialized_notification)
        return serialized

    async def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark notification as read"""
        result = await self.db.enhanced_notifications.update_one(
            {"id": notification_id, "user_id": user_id},
            {"$set": {"is_read": True, "read_at": datetime.utcnow()}}
        )
        return result.modified_count > 0

    async def mark_all_as_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user"""
        result = await self.db.enhanced_notifications.update_many(
            {"user_id": user_id, "is_read": False},
            {"$set": {"is_read": True, "read_at": datetime.utcnow()}}
        )
        return result.modified_count

    async def delete_notification(self, notification_id: str, user_id: str) -> bool:
        """Delete a notification"""
        result = await self.db.enhanced_notifications.delete_one({
            "id": notification_id,
            "user_id": user_id
        })
        return result.deleted_count > 0

    async def get_notification_stats(self, user_id: str) -> dict:
        """Get notification statistics for a user"""
        now = datetime.utcnow()
        
        total_notifications = await self.db.enhanced_notifications.count_documents({
            "user_id": user_id,
            "$or": [
                {"expires_at": None},
                {"expires_at": {"$gte": now}}
            ]
        })
        
        unread_notifications = await self.db.enhanced_notifications.count_documents({
            "user_id": user_id,
            "is_read": False,
            "$or": [
                {"expires_at": None},
                {"expires_at": {"$gte": now}}
            ]
        })
        
        # Count by priority
        priority_counts = {}
        for priority in NotificationPriority:
            count = await self.db.enhanced_notifications.count_documents({
                "user_id": user_id,
                "priority": priority,
                "is_read": False,
                "$or": [
                    {"expires_at": None},
                    {"expires_at": {"$gte": now}}
                ]
            })
            priority_counts[priority] = count
        
        return {
            "total_notifications": total_notifications,
            "unread_notifications": unread_notifications,
            "unread_by_priority": priority_counts,
            "read_percentage": round((total_notifications - unread_notifications) / total_notifications * 100, 1) if total_notifications > 0 else 0
        }