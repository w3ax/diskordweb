import {useEffect} from "react";
import { useNavigate} from "react-router-dom";

export default function HomePage()
{
    const navigate = useNavigate();
    useEffect(() => {
        fetch('http://46.63.69.24:3000/api/user/login',)
        .then((res)=>{
            if(!res.ok){
                navigate('/login')
            }
        }).catch((error) => {
            console.log(error);
        })
    }, []);
    return <h1>Home</h1>;
}