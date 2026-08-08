// Package myzubster provides a Go client for the MyZubster Gateway API.
//
// Installation:
//   go get github.com/MyZubster-Ecosystem/MyZubsterGateway/sdk/go
//
// Usage:
//   client := myzubster.NewClient("https://myzubsterapp.onrender.com")
//   client.Login("username", "password")
//   client.RegisterAnimal("Buddy", "dog")
package myzubster

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// Client represents a MyZubster Gateway API client.
type Client struct {
	BaseURL string
	Token   string
	HTTP    *http.Client
}

// NewClient creates a new MyZubster client.
func NewClient(baseURL string) *Client {
	if baseURL == "" {
		baseURL = "https://myzubsterapp.onrender.com"
	}
	return &Client{
		BaseURL: strings.TrimSuffix(baseURL, "/"),
		HTTP:    http.DefaultClient,
	}
}

func (c *Client) doRequest(method, endpoint string, body interface{}, params map[string]string) (map[string]interface{}, error) {
	u := c.BaseURL + endpoint
	if len(params) > 0 {
		v := url.Values{}
		for k, val := range params {
			v.Set(k, val)
		}
		u += "?" + v.Encode()
	}

	var bodyReader io.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(jsonData)
	}

	req, err := http.NewRequest(method, u, bodyReader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.Token)
	}

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	if resp.StatusCode >= 400 {
		return result, fmt.Errorf("[%d] %v", resp.StatusCode, result["error"])
	}
	return result, nil
}

// Login authenticates and stores the JWT token.
func (c *Client) Login(username, password string) (map[string]interface{}, error) {
	data, err := c.doRequest("POST", "/api/auth/login", map[string]string{
		"username": username,
		"password": password,
	}, nil)
	if err != nil {
		return data, err
	}
	if token, ok := data["token"].(string); ok {
		c.Token = token
	}
	return data, nil
}

// Register registers a new user.
func (c *Client) Register(username, password, email string) (map[string]interface{}, error) {
	return c.doRequest("POST", "/api/auth/register", map[string]string{
		"username": username, "password": password, "email": email,
	}, nil)
}

// GetProfile returns the current user profile.
func (c *Client) GetProfile() (map[string]interface{}, error) {
	return c.doRequest("GET", "/api/auth/profile", nil, nil)
}

// GetHealth checks API health status.
func (c *Client) GetHealth() (map[string]interface{}, error) {
	return c.doRequest("GET", "/api/health", nil, nil)
}

// GetInfo returns gateway information.
func (c *Client) GetInfo() (map[string]interface{}, error) {
	return c.doRequest("GET", "/api/info", nil, nil)
}

// RegisterAnimal registers a new animal.
func (c *Client) RegisterAnimal(name, animalType string) (map[string]interface{}, error) {
	return c.doRequest("POST", "/api/animals/register", map[string]string{
		"name": name, "type": animalType,
	}, nil)
}

// ListAnimals lists all animals.
func (c *Client) ListAnimals() (map[string]interface{}, error) {
	return c.doRequest("GET", "/api/animals", nil, nil)
}

// RegisterPlant registers a new plant.
func (c *Client) RegisterPlant(name, plantType string) (map[string]interface{}, error) {
	return c.doRequest("POST", "/api/plants/register", map[string]string{
		"name": name, "type": plantType,
	}, nil)
}

// CreateRobot creates a new robot.
func (c *Client) CreateRobot(robotID, name, walletAddress string) (map[string]interface{}, error) {
	return c.doRequest("POST", "/api/robot/create", map[string]string{
		"robotId": robotID, "name": name, "walletAddress": walletAddress,
	}, nil)
}

// AssignJob assigns a job to a robot.
func (c *Client) AssignJob(robotID, jobID, clientID string, amount float64, currency string) (map[string]interface{}, error) {
	return c.doRequest("POST", "/api/robot/assign", map[string]interface{}{
		"robotId": robotID, "jobId": jobID, "clientId": clientID,
		"amount": amount, "currency": currency,
	}, nil)
}

// CompleteJob marks a robot job as complete.
func (c *Client) CompleteJob(robotID, jobID, result string) (map[string]interface{}, error) {
	return c.doRequest("POST", "/api/robot/job/complete", map[string]string{
		"robotId": robotID, "jobId": jobID, "result": result,
	}, nil)
}

// GetSwapRate gets XMR/MYZ swap rate.
func (c *Client) GetSwapRate(from, to string, amount float64) (map[string]interface{}, error) {
	return c.doRequest("GET", "/api/swap/rate", nil, map[string]string{
		"from": from, "to": to, "amount": fmt.Sprintf("%v", amount),
	})
}

// ExecuteSwap executes a currency swap.
func (c *Client) ExecuteSwap(from, to string, amount float64, userID string) (map[string]interface{}, error) {
	return c.doRequest("POST", "/api/swap/execute", map[string]interface{}{
		"from": from, "to": to, "amount": amount, "userId": userID,
	}, nil)
}

// GetBounties lists all open bounties.
func (c *Client) GetBounties() (map[string]interface{}, error) {
	return c.doRequest("GET", "/api/bounties", nil, nil)
}

// GetRewards gets reward history for a user.
func (c *Client) GetRewards(userID string) (map[string]interface{}, error) {
	return c.doRequest("GET", "/api/rewards", nil, map[string]string{
		"userId": userID,
	})
}
