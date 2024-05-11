import {Link, useNavigate} from "react-router-dom";
import {useState} from "react";

    function LoginPage() {
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [message, setMessage] = useState('');
        const navigate = useNavigate();

        const handleLogin = async (e) => {
            e.preventDefault();
            const myHeaders = new Headers();
            myHeaders.append("Content-Type","application/json");
            const requestOptions = {
                method: 'POST',
                headers: myHeaders,
                body: JSON.stringify({email, password}),
            };

            fetch('http://46.63.69.24:3000/api/user/login', requestOptions)
            .then(async (response)=>{
                const data = await response.json()
                if(response.ok){
                    setMessage('Login successfully');
                    const token = data.authorization
                    localStorage.setItem('token', token)
                    setTimeout(() => navigate('/'), 2000);
                }
                else {
                    setMessage(`Error: ${data.error}`);
                }
            }).catch ((error) => {
                    console.error('Error:', error);
                    setMessage('Error')
                }
            )
        };
        return <>
            <div className={'flex-column d-flex justify-content-center align-items-center'}
                 style={{background: '#1f2d39', height: '100vh', width: '100%'}}>
                <h1 className={'text-center mb-3 text-white'}
                    style={{color: '#e0e0e0'}}>Login</h1>
                <form className={'bg-dark rounded-4'} onSubmit={handleLogin}
                      style={{height: '32vh', width: '35vh'}}>
                    <input className={'form-control mx-auto'} type={'email'} placeholder={'Email'}
                           value={email} onChange={(e) => setEmail(e.target.value)}
                           style={{
                               height: '4.8vh',
                               width: '26.2vh',
                               fontSize: '1.6rem',
                               marginBottom: '3vh',
                               marginTop: '3vh'
                           }}/>
                    <input className={'form-control mx-auto'} type={'password'} placeholder={'Password'}
                           value={password} onChange={(e) => setPassword(e.target.value)}
                           style={{height: '4.8vh', width: '26.2vh', fontSize: '1.6rem', marginBottom: '5vh'}}/>
                    {message && <p className={'text-danger text-center mt-4'}>{message}</p>}
                    <input className={'btn btn-primary mb-3 mx-auto d-block p-0'} type={'submit'} value={'Log in'}
                           style={{height: '4.8vh', width: '26.2vh', fontSize: '1.6rem', verticalAlign: 'middle'}}>
                    </input>
                    <p className={'text-center text-white'}>No account? <Link to="/signup">Signup</Link></p>
                </form>
            </div>
        </>;
    }

export default LoginPage;