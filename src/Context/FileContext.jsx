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
        fetch(`http://46.63.69.24:3000/api/files/${id}`, requestOptions)
            .then(response => {
                const data = response.json();
                if (!response.ok) {
                    console.error(data.error)
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