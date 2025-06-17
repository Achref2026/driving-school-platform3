# Enhanced Payment Integration for Driving School Platform
import os
import json
import hmac
import hashlib
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from enum import Enum
import uuid
import logging
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

class PaymentMethod(str, Enum):
    BARIDIMOB = "baridimob"
    CCP = "ccp"  # Chèques Postaux d'Algérie
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    CRYPTOCURRENCY = "cryptocurrency"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    EXPIRED = "expired"

class RefundStatus(str, Enum):
    NOT_REQUESTED = "not_requested"
    REQUESTED = "requested"
    PROCESSING = "processing"
    COMPLETED = "completed"
    DENIED = "denied"

class EnhancedPaymentService:
    def __init__(self, db_client):
        self.db = db_client.driving_school_platform
        
        # BaridiMob Configuration
        self.baridimob_api_key = os.environ.get('BARIDIMOB_API_KEY')
        self.baridimob_secret = os.environ.get('BARIDIMOB_SECRET')
        self.baridimob_merchant_id = os.environ.get('BARIDIMOB_MERCHANT_ID')
        self.baridimob_base_url = os.environ.get('BARIDIMOB_BASE_URL', 'https://api.baridimob.dz')
        
        # CCP Configuration  
        self.ccp_api_key = os.environ.get('CCP_API_KEY')
        self.ccp_merchant_id = os.environ.get('CCP_MERCHANT_ID')
        
        # General Configuration
        self.payment_timeout_minutes = int(os.environ.get('PAYMENT_TIMEOUT_MINUTES', '30'))
        self.webhook_secret = os.environ.get('PAYMENT_WEBHOOK_SECRET', 'default-webhook-secret')

    async def create_payment_intent(
        self,
        user_id: str,
        enrollment_id: str,
        amount: float,
        currency: str = "DZD",
        payment_method: PaymentMethod = PaymentMethod.BARIDIMOB,
        description: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Create a payment intent for processing"""
        
        payment_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(minutes=self.payment_timeout_minutes)
        
        # Get enrollment and school details
        enrollment = await self.db.enrollments.find_one({"id": enrollment_id})
        if not enrollment:
            raise ValueError("Enrollment not found")
        
        school = await self.db.driving_schools.find_one({"id": enrollment["driving_school_id"]})
        user = await self.db.users.find_one({"id": user_id})
        
        payment_doc = {
            "id": payment_id,
            "user_id": user_id,
            "enrollment_id": enrollment_id,
            "school_id": enrollment["driving_school_id"],
            "amount": amount,
            "currency": currency,
            "payment_method": payment_method,
            "status": PaymentStatus.PENDING,
            "description": description or f"Enrollment payment for {school['name'] if school else 'driving school'}",
            "metadata": metadata or {},
            "expires_at": expires_at,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "payment_attempts": [],
            "refund_status": RefundStatus.NOT_REQUESTED,
            "payment_gateway_data": {}
        }
        
        # Process based on payment method
        if payment_method == PaymentMethod.BARIDIMOB:
            gateway_response = await self._create_baridimob_payment(payment_doc, user, school)
            payment_doc["payment_gateway_data"] = gateway_response
            
        elif payment_method == PaymentMethod.CCP:
            gateway_response = await self._create_ccp_payment(payment_doc, user, school)
            payment_doc["payment_gateway_data"] = gateway_response
            
        elif payment_method == PaymentMethod.CASH:
            payment_doc["status"] = PaymentStatus.PENDING
            payment_doc["payment_gateway_data"] = {
                "instructions": "Please visit the driving school office to complete cash payment",
                "reference_number": f"CASH-{payment_id[:8].upper()}"
            }
            
        elif payment_method == PaymentMethod.BANK_TRANSFER:
            payment_doc["payment_gateway_data"] = await self._create_bank_transfer_details(payment_doc, school)
        
        # Save payment intent
        await self.db.enhanced_payments.insert_one(payment_doc)
        
        # Update enrollment payment status
        await self.db.enrollments.update_one(
            {"id": enrollment_id},
            {"$set": {"payment_id": payment_id, "payment_status": "processing"}}
        )
        
        return self._serialize_payment(payment_doc)

    async def _create_baridimob_payment(self, payment_doc: dict, user: dict, school: dict) -> Dict:
        """Create BaridiMob payment"""
        if not self.baridimob_api_key:
            # Simulation mode
            return {
                "simulation": True,
                "payment_url": f"https://simulation.baridimob.dz/pay/{payment_doc['id']}",
                "reference": f"BM{payment_doc['id'][:8].upper()}",
                "qr_code": f"BARIDIMOB:{payment_doc['amount']}:DZD:{payment_doc['id']}",
                "instructions": "This is a simulated BaridiMob payment. In production, this would redirect to actual BaridiMob payment page."
            }
        
        try:
            payload = {
                "merchant_id": self.baridimob_merchant_id,
                "amount": int(payment_doc["amount"] * 100),  # Convert to centimes
                "currency": payment_doc["currency"],
                "order_id": payment_doc["id"],
                "description": payment_doc["description"],
                "customer": {
                    "name": f"{user['first_name']} {user['last_name']}",
                    "email": user["email"],
                    "phone": user.get("phone", ""),
                },
                "return_url": f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/payment/success",
                "cancel_url": f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/payment/cancel",
                "webhook_url": f"{os.environ.get('BACKEND_URL', 'http://localhost:8001')}/api/payments/webhook/baridimob"
            }
            
            headers = {
                "Authorization": f"Bearer {self.baridimob_api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                f"{self.baridimob_base_url}/v1/payments",
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "payment_id": data.get("payment_id"),
                    "payment_url": data.get("payment_url"),
                    "reference": data.get("reference"),
                    "expires_at": data.get("expires_at")
                }
            else:
                logger.error(f"BaridiMob payment creation failed: {response.text}")
                raise Exception("Failed to create BaridiMob payment")
                
        except Exception as e:
            logger.error(f"BaridiMob API error: {str(e)}")
            # Fallback to simulation
            return {
                "error": "BaridiMob service unavailable",
                "simulation": True,
                "payment_url": f"https://simulation.baridimob.dz/pay/{payment_doc['id']}",
                "reference": f"BM{payment_doc['id'][:8].upper()}"
            }

    async def _create_ccp_payment(self, payment_doc: dict, user: dict, school: dict) -> Dict:
        """Create CCP payment"""
        return {
            "simulation": True,
            "ccp_account": "1234567890123456789",  # School's CCP account
            "reference": f"CCP{payment_doc['id'][:10].upper()}",
            "amount": payment_doc["amount"],
            "beneficiary": school["name"] if school else "Driving School",
            "instructions": f"Transfer {payment_doc['amount']} DZD to CCP account with reference {payment_doc['id'][:10].upper()}",
            "qr_code": f"CCP:{payment_doc['amount']}:DZD:{payment_doc['id'][:10]}"
        }

    async def _create_bank_transfer_details(self, payment_doc: dict, school: dict) -> Dict:
        """Create bank transfer payment details"""
        return {
            "bank_name": "Banque Nationale d'Algérie (BNA)",
            "account_number": "123456789012345",  # School's bank account
            "iban": "DZ210123456789012345678901",
            "swift_code": "BNALDZDZ",
            "reference": f"BANK{payment_doc['id'][:8].upper()}",
            "amount": payment_doc["amount"],
            "beneficiary": school["name"] if school else "Driving School",
            "instructions": "Include the reference number in your transfer description"
        }

    async def process_webhook(self, provider: str, payload: dict, signature: str) -> Dict:
        """Process payment webhook from providers"""
        
        # Verify webhook signature
        if not self._verify_webhook_signature(provider, payload, signature):
            raise ValueError("Invalid webhook signature")
        
        if provider == "baridimob":
            return await self._process_baridimob_webhook(payload)
        elif provider == "ccp":
            return await self._process_ccp_webhook(payload)
        else:
            raise ValueError(f"Unsupported payment provider: {provider}")

    def _verify_webhook_signature(self, provider: str, payload: dict, signature: str) -> bool:
        """Verify webhook signature"""
        if provider == "baridimob":
            expected_signature = hmac.new(
                self.baridimob_secret.encode() if self.baridimob_secret else b"test-secret",
                json.dumps(payload, sort_keys=True).encode(),
                hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(signature, expected_signature)
        
        return True  # For demo purposes

    async def _process_baridimob_webhook(self, payload: dict) -> Dict:
        """Process BaridiMob webhook"""
        payment_id = payload.get("order_id")
        status = payload.get("status")
        
        if not payment_id:
            raise ValueError("Missing payment ID in webhook")
        
        payment = await self.db.enhanced_payments.find_one({"id": payment_id})
        if not payment:
            raise ValueError("Payment not found")
        
        # Map BaridiMob status to our status
        status_mapping = {
            "completed": PaymentStatus.COMPLETED,
            "failed": PaymentStatus.FAILED,
            "cancelled": PaymentStatus.FAILED,
            "pending": PaymentStatus.PROCESSING
        }
        
        new_status = status_mapping.get(status, PaymentStatus.PENDING)
        
        # Update payment
        await self._update_payment_status(payment_id, new_status, {
            "gateway_transaction_id": payload.get("transaction_id"),
            "gateway_reference": payload.get("reference"),
            "gateway_fee": payload.get("fee", 0),
            "processed_at": datetime.utcnow()
        })
        
        return {"status": "processed", "payment_id": payment_id}

    async def _update_payment_status(self, payment_id: str, status: PaymentStatus, metadata: Dict = None):
        """Update payment status and handle side effects"""
        
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow()
        }
        
        if metadata:
            update_data["gateway_metadata"] = metadata
        
        # Update payment
        await self.db.enhanced_payments.update_one(
            {"id": payment_id},
            {"$set": update_data}
        )
        
        # Get payment details
        payment = await self.db.enhanced_payments.find_one({"id": payment_id})
        if not payment:
            return
        
        # Update enrollment based on payment status
        if status == PaymentStatus.COMPLETED:
            await self.db.enrollments.update_one(
                {"id": payment["enrollment_id"]},
                {"$set": {
                    "payment_status": "completed",
                    "enrollment_status": "pending_documents",
                    "paid_at": datetime.utcnow()
                }}
            )
            
            # Send notification
            await self._send_payment_notification(payment["user_id"], "payment_completed", {
                "amount": payment["amount"],
                "payment_method": payment["payment_method"],
                "reference": payment.get("gateway_metadata", {}).get("gateway_reference", payment_id[:8])
            })
            
        elif status == PaymentStatus.FAILED:
            await self.db.enrollments.update_one(
                {"id": payment["enrollment_id"]},
                {"$set": {"payment_status": "failed"}}
            )
            
            # Send notification
            await self._send_payment_notification(payment["user_id"], "payment_failed", {
                "amount": payment["amount"],
                "payment_method": payment["payment_method"]
            })

    async def _send_payment_notification(self, user_id: str, notification_type: str, metadata: Dict):
        """Send payment-related notifications"""
        from enhanced_notifications import EnhancedNotificationService, NotificationPriority, NotificationChannel
        
        notification_service = EnhancedNotificationService(self.db._client)
        
        if notification_type == "payment_completed":
            await notification_service.create_notification(
                user_id=user_id,
                notification_type="payment_completed",
                title="Payment Successful! 💳",
                message=f"Your payment of {metadata['amount']} DZD has been processed successfully. You can now upload your documents to complete enrollment.",
                priority=NotificationPriority.HIGH,
                channels=[NotificationChannel.EMAIL, NotificationChannel.IN_APP],
                metadata=metadata
            )
        elif notification_type == "payment_failed":
            await notification_service.create_notification(
                user_id=user_id,
                notification_type="payment_failed",
                title="Payment Failed ❌",
                message=f"Your payment of {metadata['amount']} DZD could not be processed. Please try again or contact support.",
                priority=NotificationPriority.HIGH,
                channels=[NotificationChannel.EMAIL, NotificationChannel.IN_APP],
                metadata=metadata
            )

    async def get_payment_details(self, payment_id: str, user_id: str = None) -> Dict:
        """Get payment details"""
        query = {"id": payment_id}
        if user_id:
            query["user_id"] = user_id
        
        payment = await self.db.enhanced_payments.find_one(query)
        if not payment:
            raise ValueError("Payment not found")
        
        return self._serialize_payment(payment)

    async def get_user_payments(self, user_id: str, limit: int = 50, skip: int = 0) -> Dict:
        """Get user's payment history"""
        payments_cursor = self.db.enhanced_payments.find({"user_id": user_id}).sort("created_at", -1).skip(skip).limit(limit)
        payments = await payments_cursor.to_list(length=limit)
        
        total = await self.db.enhanced_payments.count_documents({"user_id": user_id})
        
        return {
            "payments": [self._serialize_payment(payment) for payment in payments],
            "total": total,
            "limit": limit,
            "skip": skip
        }

    async def request_refund(self, payment_id: str, user_id: str, reason: str, amount: Optional[float] = None) -> Dict:
        """Request a refund for a payment"""
        payment = await self.db.enhanced_payments.find_one({"id": payment_id, "user_id": user_id})
        if not payment:
            raise ValueError("Payment not found")
        
        if payment["status"] != PaymentStatus.COMPLETED:
            raise ValueError("Can only refund completed payments")
        
        if payment["refund_status"] != RefundStatus.NOT_REQUESTED:
            raise ValueError("Refund already requested for this payment")
        
        refund_amount = amount or payment["amount"]
        if refund_amount > payment["amount"]:
            raise ValueError("Refund amount cannot exceed payment amount")
        
        refund_id = str(uuid.uuid4())
        refund_doc = {
            "id": refund_id,
            "payment_id": payment_id,
            "user_id": user_id,
            "amount": refund_amount,
            "reason": reason,
            "status": RefundStatus.REQUESTED,
            "requested_at": datetime.utcnow()
        }
        
        await self.db.payment_refunds.insert_one(refund_doc)
        
        # Update payment refund status
        await self.db.enhanced_payments.update_one(
            {"id": payment_id},
            {"$set": {"refund_status": RefundStatus.REQUESTED}}
        )
        
        return {"refund_id": refund_id, "status": "requested"}

    async def get_payment_statistics(self, school_id: str = None, date_from: datetime = None, date_to: datetime = None) -> Dict:
        """Get payment statistics"""
        query = {}
        
        if school_id:
            query["school_id"] = school_id
        
        if date_from or date_to:
            date_query = {}
            if date_from:
                date_query["$gte"] = date_from
            if date_to:
                date_query["$lte"] = date_to
            query["created_at"] = date_query
        
        # Aggregate statistics
        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1},
                    "total_amount": {"$sum": "$amount"}
                }
            }
        ]
        
        results = await self.db.enhanced_payments.aggregate(pipeline).to_list(length=None)
        
        stats = {
            "total_payments": 0,
            "total_amount": 0,
            "completed_payments": 0,
            "completed_amount": 0,
            "pending_payments": 0,
            "pending_amount": 0,
            "failed_payments": 0,
            "failed_amount": 0,
            "success_rate": 0
        }
        
        for result in results:
            status = result["_id"]
            count = result["count"]
            amount = result["total_amount"]
            
            stats["total_payments"] += count
            stats["total_amount"] += amount
            
            if status == PaymentStatus.COMPLETED:
                stats["completed_payments"] = count
                stats["completed_amount"] = amount
            elif status == PaymentStatus.PENDING:
                stats["pending_payments"] = count
                stats["pending_amount"] = amount
            elif status == PaymentStatus.FAILED:
                stats["failed_payments"] = count
                stats["failed_amount"] = amount
        
        if stats["total_payments"] > 0:
            stats["success_rate"] = round((stats["completed_payments"] / stats["total_payments"]) * 100, 2)
        
        return stats

    def _serialize_payment(self, payment: dict) -> dict:
        """Serialize payment for JSON response"""
        serialized = {}
        for key, value in payment.items():
            if key == '_id':
                continue
            elif isinstance(value, datetime):
                serialized[key] = value.isoformat()
            else:
                serialized[key] = value
        return serialized

    async def cleanup_expired_payments(self):
        """Clean up expired payments"""
        now = datetime.utcnow()
        
        # Find expired pending payments
        expired_payments = await self.db.enhanced_payments.find({
            "status": {"$in": [PaymentStatus.PENDING, PaymentStatus.PROCESSING]},
            "expires_at": {"$lt": now}
        }).to_list(length=None)
        
        for payment in expired_payments:
            await self._update_payment_status(payment["id"], PaymentStatus.EXPIRED)
            
            # Update enrollment
            await self.db.enrollments.update_one(
                {"id": payment["enrollment_id"]},
                {"$set": {"payment_status": "failed"}}
            )
        
        logger.info(f"Marked {len(expired_payments)} payments as expired")
        return len(expired_payments)