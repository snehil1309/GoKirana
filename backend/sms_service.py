import os
import requests
import logging

logger = logging.getLogger("uvicorn.error")

MSG91_AUTH_KEY = os.getenv("MSG91_AUTH_KEY", "")
MSG91_SENDER_ID = os.getenv("MSG91_SENDER_ID", "GOKRNA")
MSG91_OTP_TEMPLATE_ID = os.getenv("MSG91_OTP_TEMPLATE_ID", "")
MSG91_USER_ORDER_TEMPLATE_ID = os.getenv("MSG91_USER_ORDER_TEMPLATE_ID", "")
MSG91_MERCHANT_ORDER_TEMPLATE_ID = os.getenv("MSG91_MERCHANT_ORDER_TEMPLATE_ID", "")

def send_otp(mobile_number: str, otp: str, template_id: str = None) -> dict:
    """
    Sends OTP via MSG91 OTP API.
    Mobile number format: 919106804063 (country code + number, without '+')
    """
    if not MSG91_AUTH_KEY:
        logger.warning("MSG91_AUTH_KEY not configured. Skipping SMS.")
        return {"status": "error", "message": "MSG91 Auth Key not configured"}

    clean_mobile = str(mobile_number).replace("+", "").strip()
    if len(clean_mobile) == 10:
        clean_mobile = "91" + clean_mobile

    target_template = template_id or MSG91_OTP_TEMPLATE_ID

    # MSG91 Send OTP API requires parameters via URL query strings
    params = {
        "authkey": MSG91_AUTH_KEY,
        "mobile": clean_mobile,
        "otp": otp
    }
    if target_template:
        params["template_id"] = target_template

    url = "https://control.msg91.com/api/v5/otp"

    try:
        response = requests.post(url, params=params, timeout=10)
        res_data = response.json()
        logger.info(f"MSG91 OTP Response: {res_data}")
        return res_data
    except Exception as e:
        logger.error(f"Failed to send SMS via MSG91: {str(e)}")
        return {"status": "error", "message": str(e)}


def send_flow_sms(mobile_number: str, template_id: str, variables: dict) -> dict:
    """
    Sends transactional notifications using MSG91 Flow API (v5).
    """
    if not MSG91_AUTH_KEY:
        logger.warning("MSG91_AUTH_KEY not configured. Skipping SMS.")
        return {"status": "error", "message": "MSG91 Auth Key not configured"}

    clean_mobile = str(mobile_number).replace("+", "").strip()
    if len(clean_mobile) == 10:
        clean_mobile = "91" + clean_mobile

    url = "https://control.msg91.com/api/v5/flow/"
    
    payload = {
        "template_id": template_id,
        "short_url": "0",
        "recipients": [
            {
                "mobiles": clean_mobile,
                **variables
            }
        ]
    }
    
    headers = {
        "authkey": MSG91_AUTH_KEY,
        "content-type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        res_data = response.json()
        logger.info(f"MSG91 Flow SMS Response: {res_data}")
        return res_data
    except Exception as e:
        logger.error(f"Failed to send Flow SMS via MSG91: {str(e)}")
        return {"status": "error", "message": str(e)}
