import {useEffect} from "react";
import { useNavigate} from "react-router-dom";

export default function HomePage()
{
    const navigate = useNavigate();
    useEffect(() => {
        const myHeaders = new Headers();
        myHeaders.append("Authorization", "Bearer " + localStorage.getItem("token"));
        const requestOptions = {
            method: "GET",
            headers: myHeaders,
            redirect: "follow"
        };

        fetch("http://46.63.69.24:3000/api/user/validate", requestOptions)
            .then((response) => {
                if(!response.ok){
                    navigate('/login')
                }
            })
            .then((result) => console.log(result))
            .catch((error) => console.error(error));
    }, []);
    return <h1>Home</h1>;
}