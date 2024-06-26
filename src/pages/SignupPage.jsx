import { Link } from "react-router-dom";
import { useState } from "react";
import useNotification from '../Functions/Notification';

function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const { Notification, showNotification } = useNotification();

    const handleSignup = async (e) => {
        e.preventDefault();
        if(password !== confirmPassword) {
            showNotification("Passwords don't match", 'error');
            return;
        }
        try {
            const response = await fetch(import.meta.env.VITE_API_SERVER+'user/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
            if (response.ok) {
                showNotification('Signup successfully', 'success');
            } else {
                const body = await response.json();
                showNotification(`Error: ${body.error}`, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error', 'error');
        }
    };

    return (
        <>
            <div className={'flex-column d-flex justify-content-center align-items-center'}
                 style={{ background: '#1f2d39', height: '100vh', width: '100%' }}>
                <h1 className={'text-center mb-3'}
                    style={{ color: '#e0e0e0' }}>Sign up</h1>
                <form className={'d-flex row align-content-between bg-dark rounded-4'} onSubmit={handleSignup}
                      style={{ height: '40vh', width: '35vh' }}>
                    <div>
                        <input className={'form-control mx-auto'} type={'email'} placeholder={'Email'}
                               value={email} onChange={(e) => setEmail(e.target.value)}
                               style={{
                                   height: '4.8vh',
                                   width: '26.2vh',
                                   fontSize: '1.6rem',
                                   marginBottom: '3vh',
                                   marginTop: '3vh'
                               }} />
                        <input className={'form-control mx-auto'} type={'password'} placeholder={'Password'}
                               value={password} onChange={(e) => setPassword(e.target.value)}
                               style={{ height: '4.8vh', width: '26.2vh', fontSize: '1.6rem', marginBottom: '3vh' }} />
                        <input className={'form-control mx-auto'} type={'password'} placeholder={'Confirm password'}
                               value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                               style={{ height: '4.8vh', width: '26.2vh', fontSize: '1.6rem' }} />
                    </div>
                    <div>
                        <input className={'btn btn-primary mb-3 mx-auto d-block p-0'} type={'submit'} value={'Sign up'}
                               style={{ height: '4.8vh', width: '26.2vh', fontSize: '1.6rem', verticalAlign: 'middle' }}>
                        </input>
                        <p className={'text-center text-white mb-5'}>Already have an account? <Link to="/login">Login</Link></p>
                    </div>
                </form>
            </div>
            <Notification />
        </>
    );
}

export default SignupPage;
