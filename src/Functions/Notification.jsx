import { useState } from 'react';

const useNotification = () => {
    const [notification, setNotification] = useState(null);
    const [isNotificationVisible, setIsNotificationVisible] = useState(false);
    const [notificationTimer, setNotificationTimer] = useState(null);
    const [notificationType, setNotificationType] = useState('success');

    const showNotification = (message, type = 'success') => {
        setNotification(message);
        setNotificationType(type);
        setIsNotificationVisible(true);
        if (notificationTimer) {
            clearTimeout(notificationTimer);
        }
        const timer = setTimeout(() => {
            setIsNotificationVisible(false);
        }, 2000);
        setNotificationTimer(timer);
    };

    const Notification = () => {
        if (!isNotificationVisible) return null;

        const backgroundColor = notificationType === 'success' ? 'green' : 'red';

        return (
            <div className="notification" style={{
                position: 'fixed',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: backgroundColor,
                color: '#fff',
                padding: '10px 20px',
                borderRadius: '5px',
                zIndex: 1000,
                textAlign: 'center',
            }}>
                {notification}
            </div>
        );
    };

    return { Notification, showNotification };
};

export default useNotification;
