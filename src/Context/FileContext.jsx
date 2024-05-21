import React, {useContext, useEffect} from "react";
import {useParams} from "react-router-dom";

const FileContext = React.createContext(null);


export function useFile(){
    return useContext(FileContext);
}

// eslint-disable-next-line react/prop-types
export default function FileProvider({ children })  {
    const [file, setFile] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const {id} = useParams();

    useEffect(() => {
        const myHeaders = new Headers();
        myHeaders.append("Authorization", "Bearer " + localStorage.getItem("token"));
        const requestOptions = {
            method: 'GET',
            headers: myHeaders,
        };
        fetch(import.meta.env.VITE_API_SERVER+`files/${id}`, requestOptions)
            .then(response => {
                const data = response.json();
                if (!response.ok) {
                    console.error(data.error)
                    return null;
                }
                return data;
            })
            .then(file => {
                setFile(file);
                setLoading(false);
            })
            .catch((error)=> {
                console.error(error)
                setLoading(false);
            });
    }, []);
    const value = {
        file
    }
    return (
        <FileContext.Provider value={value}>
            {!loading && children}
        </FileContext.Provider>
    )
}